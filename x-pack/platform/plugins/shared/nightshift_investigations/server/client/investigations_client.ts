/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { z } from '@kbn/zod/v4';
import type { InvestigationState } from '@kbn/significant-events-schema';
import { investigationStateSchema } from '@kbn/significant-events-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { INVESTIGATE_STEP_ID, severitySchema, type Severity } from '@kbn/significant-events-schema';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import type {
  AlertInvestigationContext,
  GetInvestigationResponse,
  InvestigationContext,
  InvestigationStatus,
  InvestigationSubject,
  InvestigationTriggerType,
  ListInvestigationItem,
  ListInvestigationsRequest,
  ListInvestigationsResponse,
  StartInvestigationRequest,
  StartInvestigationResponse,
} from '../../common';
import {
  alertInvestigationContextSchema,
  DEFAULT_INVESTIGATION_TRIGGER_TYPE,
  freeFormContextSchema,
  INVESTIGATION_TRIGGER_TYPES,
} from '../../common';
import { buildInvestigationMessage } from './build_investigation_message';
import { InvalidInvestigationContextError, InvestigationNotFoundError } from './errors';
import { InvestigationUnavailableError } from './investigation_unavailable_error';
export {
  InvalidInvestigationContextError,
  InvestigationNotFoundError,
  InvestigationUnavailableError,
};

const SORT_FIELD_MAP: Record<
  NonNullable<ListInvestigationsRequest['sort_field']>,
  'createdAt' | 'finishedAt'
> = {
  created_at: 'createdAt',
  finished_at: 'finishedAt',
};

/**
 * Step-execution documents fetched per listed investigation. The search filters on the `ai.agent`
 * step type, so the engine's step-level timeout wrapper — which shares the `investigate` step id —
 * is excluded server-side and only the agent's own attempts count against this. One attempt is the
 * norm, so this leaves headroom for a retry. Runs past the budget lose their severity in the list,
 * which {@link getSeverities} logs.
 */
const STEP_EXECUTIONS_PER_INVESTIGATION = 2;

/**
 * `_source` paths the severity lookup reads. Deliberately narrow: an `investigate` step's full
 * output holds the summary, every hypothesis with its evidence, and the recommendations, which
 * runs to megabytes per document and is not worth transferring to read one enum. `startedAt`
 * orders retries.
 */
const SEVERITY_SOURCE_INCLUDES = [
  'workflowRunId',
  'startedAt',
  'output.structured_output.severity',
];

/** `stepType` of the step execution that carries the agent's structured output. */
const AI_AGENT_STEP_TYPE = 'ai.agent';

function toExecutionStatuses(status: InvestigationStatus): ExecutionStatus[] {
  switch (status) {
    case 'pending':
      return [ExecutionStatus.PENDING, ExecutionStatus.QUEUED];
    case 'running':
      return [
        ExecutionStatus.RUNNING,
        ExecutionStatus.WAITING,
        ExecutionStatus.WAITING_FOR_INPUT,
        ExecutionStatus.WAITING_FOR_CHILD,
      ];
    case 'completed':
      return [ExecutionStatus.COMPLETED];
    case 'failed':
      return [ExecutionStatus.FAILED, ExecutionStatus.TIMED_OUT];
    case 'cancelled':
      return [ExecutionStatus.CANCELLED, ExecutionStatus.SKIPPED];
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v || undefined : undefined;
}

function asSeverity(v: unknown, logger: Logger): Severity | undefined {
  if (v === undefined) return undefined;
  const parsed = severitySchema.safeParse(v);
  if (parsed.success) return parsed.data;
  logger.warn(
    `Investigation reported an unrecognized severity ${JSON.stringify(v)}, dropping it: ` +
      z.prettifyError(parsed.error)
  );
  return undefined;
}

/**
 * The workflow engine wraps an `ai.agent` step's schema output in a `structured_output` envelope,
 * so the investigation's fields live at `output.structured_output.*` rather than on `output`.
 */
function toStructuredOutput(output: unknown): Record<string, unknown> | undefined {
  if (!isPlainObject(output)) return undefined;
  const structured = output.structured_output;
  return isPlainObject(structured) ? structured : undefined;
}

interface InvestigateStepExecution {
  stepId?: string;
  stepType?: string;
  startedAt?: string;
  output?: unknown;
}

/**
 * Structured output of the newest `investigate` attempt among these step executions, or undefined
 * when none produced one.
 *
 * The single rule both `get()` and `list()` resolve investigation results with, so the two
 * endpoints cannot disagree about a run. A run writes several documents under the `investigate`
 * step id — the step-level timeout wrapper shares it, retries add more — and only the `ai.agent`
 * attempt carries the agent's output. `startedAt` decides between attempts rather than array
 * order, which differs between the engine's mget and search read paths. A document that omits
 * `stepId` or `stepType` is kept rather than skipped, so a payload without them still resolves.
 */
function latestInvestigateOutput(
  stepExecutions: InvestigateStepExecution[] | undefined
): Record<string, unknown> | undefined {
  let latest: { startedAt?: string; structured: Record<string, unknown> } | undefined;

  for (const step of stepExecutions ?? []) {
    if (step.stepId !== undefined && step.stepId !== INVESTIGATE_STEP_ID) continue;
    if (step.stepType !== undefined && step.stepType !== AI_AGENT_STEP_TYPE) continue;

    const structured = toStructuredOutput(step.output);
    if (!structured) continue;

    if (!latest || (step.startedAt ?? '') >= (latest.startedAt ?? '')) {
      latest = { startedAt: step.startedAt, structured };
    }
  }

  return latest?.structured;
}

function toInvestigationStatus(status: ExecutionStatus, logger: Logger): InvestigationStatus {
  switch (status) {
    case ExecutionStatus.PENDING:
    case ExecutionStatus.QUEUED:
      return 'pending';
    case ExecutionStatus.RUNNING:
    case ExecutionStatus.WAITING:
    case ExecutionStatus.WAITING_FOR_INPUT:
    case ExecutionStatus.WAITING_FOR_CHILD:
      return 'running';
    case ExecutionStatus.COMPLETED:
      return 'completed';
    case ExecutionStatus.FAILED:
    case ExecutionStatus.TIMED_OUT:
      return 'failed';
    case ExecutionStatus.CANCELLED:
    case ExecutionStatus.SKIPPED:
      return 'cancelled';
    default: {
      // TypeScript will error here if a new ExecutionStatus value is added without a case above.
      const _exhaustiveCheck: never = status;
      logger.warn(
        `Unknown workflow ExecutionStatus "${_exhaustiveCheck}" for investigation, treating as running`
      );
      return 'running';
    }
  }
}

function isTerminalStatus(status: InvestigationStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function recoverSubjectFromInput(
  input: Record<string, unknown> | undefined
): InvestigationSubject | undefined {
  const ctx = input?.context;
  if (!isPlainObject(ctx)) return undefined;
  if (ctx.source === 'significant_event') {
    const id = asString(ctx.event_id) ?? asString(ctx.significant_event_id);
    return id ? { type: 'significant_event', id } : undefined;
  }
  if (ctx.source === 'alert') {
    const id = asString(ctx.alert_id);
    return id ? { type: 'alert', id } : undefined;
  }
  return undefined;
}

function recoverTriggerTypeFromInput(
  input: Record<string, unknown> | undefined
): InvestigationTriggerType | undefined {
  const ctx = input?.context;
  if (!isPlainObject(ctx)) return undefined;
  const valid: readonly string[] = INVESTIGATION_TRIGGER_TYPES;
  return valid.includes(String(ctx.trigger_type))
    ? (ctx.trigger_type as InvestigationTriggerType)
    : undefined;
}

export interface NightshiftInvestigationsClientDeps {
  request: KibanaRequest;
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaces?: SpacesPluginStart;
  logger: Logger;
  /**
   * Explicit override for contexts where the request cannot carry space info (e.g. workflow step
   * definitions using getFakeRequest). See https://github.com/elastic/kibana/issues/284786.
   */
  spaceIdOverride?: string;
  agentBuilder?: AgentBuilderPluginStart;
}

export class NightshiftInvestigationsClient {
  private readonly request: KibanaRequest;
  private readonly workflowsManagement: WorkflowsServerPluginSetup | undefined;
  private readonly spaces: SpacesPluginStart | undefined;
  private readonly logger: Logger;
  private readonly spaceIdOverride?: string;
  private readonly agentBuilder?: AgentBuilderPluginStart;

  constructor(deps: NightshiftInvestigationsClientDeps) {
    this.request = deps.request;
    this.workflowsManagement = deps.workflowsManagement;
    this.spaces = deps.spaces;
    this.logger = deps.logger;
    this.spaceIdOverride = deps.spaceIdOverride;
    this.agentBuilder = deps.agentBuilder;
  }

  private getSpaceId(): string {
    return (
      this.spaceIdOverride ??
      this.spaces?.spacesService.getSpaceId(this.request) ??
      DEFAULT_SPACE_ID
    );
  }

  /**
   * Validates the context against the contract for its subject type and composes the brief the
   * agent will read. Done here and not only in the route schema, because the workflow step
   * definition and the plugin start contract both reach `start` without passing through route
   * validation. Each branch parses with its own schema, so the alert brief is composed from a
   * value the schema has already vouched for rather than from a re-checked `unknown`.
   */
  private prepareAgentInput(
    subject: InvestigationSubject,
    message: string | undefined,
    context: InvestigationContext | AlertInvestigationContext
  ): { message: string; context: Record<string, unknown> } {
    if (subject.type === 'alert') {
      const parsed = alertInvestigationContextSchema.safeParse(context);
      if (!parsed.success) {
        throw new InvalidInvestigationContextError(subject.type, parsed.error);
      }
      // An alert investigation always gets the brief composed from its alert data — that is what
      // the alert context exists for. Every other subject keeps the caller-supplied message.
      return { message: buildInvestigationMessage(parsed.data), context: parsed.data };
    }

    const parsed = freeFormContextSchema.safeParse(context);
    if (!parsed.success) {
      throw new InvalidInvestigationContextError(subject.type, parsed.error);
    }
    return {
      message: message ?? `Investigation requested for ${subject.type} ${subject.id}`,
      context: parsed.data,
    };
  }

  async start({
    subject,
    trigger_type,
    message,
    stream_names,
    concurrency_key,
    context = {},
  }: StartInvestigationRequest): Promise<StartInvestigationResponse> {
    if (!this.workflowsManagement) {
      throw new InvestigationUnavailableError('workflowsManagement is not available');
    }

    if (!this.agentBuilder) {
      throw new InvestigationUnavailableError('agentBuilder is not available');
    }

    const prepared = this.prepareAgentInput(subject, message, context);

    const spaceId = this.getSpaceId();

    // The `nightshift.ensureInvestigationAgent` workflow step is the general guarantee that the
    // agent exists wherever an investigation runs. This narrower install stays because the run
    // below executes the *stored* workflow definition, which predates that step until the managed
    // install has upgraded it — and that install is fire-and-forget. Deliberately without the
    // step's visibility retry: the workflow owns that, and this request path should not pay for it.
    await installInvestigationAgent({ agentBuilder: this.agentBuilder, spaceId });

    const workflow = await this.workflowsManagement.management.getWorkflow(
      SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
      spaceId
    );

    if (!workflow?.definition) {
      this.logger.error(
        `Investigation workflow "${SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID}" is not installed in space "${spaceId}"`
      );
      throw new InvestigationUnavailableError('Investigations are not configured in this space');
    }

    const inputs = {
      message: prepared.message,
      stream_names: stream_names ?? [],
      ...(concurrency_key ? { concurrency_key } : {}),
      context: {
        ...prepared.context,
        source: subject.type,
        [`${subject.type}_id`]: subject.id,
        trigger_type: trigger_type ?? DEFAULT_INVESTIGATION_TRIGGER_TYPE,
        ...(subject.summary ? { summary: subject.summary } : {}),
      },
    };

    const executionId = await this.workflowsManagement.management.runWorkflow(
      { ...workflow, definition: workflow.definition },
      spaceId,
      inputs,
      this.request,
      'nightshift-investigations'
    );

    this.logger.info(
      `Started investigation for ${subject.type}/${subject.id}, execution_id=${executionId}`
    );

    return { investigation_id: executionId };
  }

  async get(investigationId: string): Promise<GetInvestigationResponse> {
    if (!this.workflowsManagement) {
      throw new Error('workflowsManagement is not available');
    }

    const spaceId = this.getSpaceId();
    const execution = await this.workflowsManagement.management.getWorkflowExecution(
      investigationId,
      spaceId,
      { includeOutput: true }
    );

    if (!execution) {
      throw new InvestigationNotFoundError(investigationId);
    }

    if (execution.workflowId !== SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID) {
      throw new InvestigationNotFoundError(investigationId);
    }

    const status = toInvestigationStatus(execution.status, this.logger);
    const isTerminal = isTerminalStatus(status);

    // runWorkflow stores inputs at context.inputs in the execution document.
    const executionInputs = execution.context?.inputs;
    const rawInput = isPlainObject(executionInputs) ? executionInputs : undefined;

    // Step-level output is populated when includeOutput: true.
    const structuredOutput = latestInvestigateOutput(execution.stepExecutions);

    const subject = recoverSubjectFromInput(rawInput);
    const recoveredTriggerType = recoverTriggerTypeFromInput(rawInput);
    const rawContext = isPlainObject(rawInput?.context) ? rawInput.context : undefined;
    const subjectSummary = asString(rawContext?.summary);

    return {
      investigation_id: investigationId,
      subject: subject && subjectSummary ? { ...subject, summary: subjectSummary } : subject,
      trigger_type: recoveredTriggerType,
      status,
      started_at: execution.startedAt,
      completed_at: isTerminal ? execution.finishedAt : undefined,
      conclusion:
        status === 'completed'
          ? asString(structuredOutput?.conclusion) ?? asString(structuredOutput?.summary)
          : undefined,
      severity:
        status === 'completed' ? asSeverity(structuredOutput?.severity, this.logger) : undefined,
      result: status === 'completed' ? this.toResult(investigationId, structuredOutput) : undefined,
      error: (() => {
        if (status !== 'failed') return undefined;
        if (execution.error?.message) {
          this.logger.warn(`Investigation "${investigationId}" failed: ${execution.error.message}`);
        }
        return 'Investigation failed';
      })(),
    };
  }

  /**
   * The agent's full output, validated against the schema it was generated from.
   *
   * `investigationStateSchema` is not a description of this payload written after the fact: the
   * workflow's `investigate` step declares its output schema from it, and the progress-report tool
   * streams the same shape while the run is live. Validating here means a caller reading a
   * finished investigation and one following a live stream can use a single renderer.
   *
   * Output that fails the schema is dropped rather than returned half-parsed, and logged so the
   * mismatch is visible. `conclusion` is populated separately from the raw payload, so the caller
   * still gets the narrative and loses only the structure around it.
   */
  private toResult(
    investigationId: string,
    rawOutput: Record<string, unknown> | undefined
  ): InvestigationState | undefined {
    if (!rawOutput) return undefined;

    const parsed = investigationStateSchema.safeParse(rawOutput);
    if (!parsed.success) {
      this.logger.warn(
        `Investigation "${investigationId}" produced output that does not match ` +
          `investigationStateSchema: ${z.prettifyError(parsed.error)}`
      );
      return undefined;
    }

    return parsed.data;
  }

  async list({
    statuses,
    started_after,
    started_before,
    finished_after,
    finished_before,
    sort_field,
    sort_order,
    page = 1,
    size = 20,
  }: ListInvestigationsRequest = {}): Promise<ListInvestigationsResponse> {
    if (!this.workflowsManagement) {
      throw new Error('workflowsManagement is not available');
    }

    const spaceId = this.getSpaceId();
    const executionStatuses = statuses?.flatMap(toExecutionStatuses);

    const result = await this.workflowsManagement.management.getWorkflowExecutions(
      {
        workflowId: SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
        omitStepRuns: true,
        ...(executionStatuses?.length ? { statuses: executionStatuses } : {}),
        startedAfter: started_after,
        startedBefore: started_before,
        finishedAfter: finished_after,
        finishedBefore: finished_before,
        sortField: sort_field != null ? SORT_FIELD_MAP[sort_field] : 'createdAt',
        sortOrder: sort_order,
        page,
        size,
      },
      spaceId
    );

    const executions = result.results.map((execution) => ({
      execution,
      status: toInvestigationStatus(execution.status, this.logger),
    }));

    const severityById = await this.getSeverities(
      executions
        .filter(({ status }) => status === 'completed')
        .map(({ execution }) => execution.id),
      spaceId
    );

    const results: ListInvestigationItem[] = executions.map(({ execution, status }) => ({
      investigation_id: execution.id,
      status,
      started_at: execution.startedAt,
      completed_at: isTerminalStatus(status) ? execution.finishedAt : undefined,
      severity: severityById.get(execution.id),
      concurrency_key: execution.concurrencyGroupKey,
      executed_by: execution.executedBy,
    }));

    return { results, page: result.page, size: result.size, total: result.total };
  }

  /**
   * Severity by investigation id for a page of listed investigations. The execution list carries
   * no step output — `WorkflowExecutionListItemDto` omits `stepExecutions`, and the execution
   * document's `context` only ever holds the run inputs — so it takes one extra search over the
   * `investigate` step executions of exactly these runs, whatever the page size. An investigation
   * id is the workflow execution id, which the step documents carry as `workflowRunId`.
   *
   * Severity is supplementary to a list of investigations, so a failing lookup degrades to no
   * severities rather than failing the list.
   */
  private async getSeverities(
    investigationIds: string[],
    spaceId: string
  ): Promise<Map<string, Severity>> {
    const severityById = new Map<string, Severity>();
    if (!this.workflowsManagement || investigationIds.length === 0) {
      return severityById;
    }

    const size = investigationIds.length * STEP_EXECUTIONS_PER_INVESTIGATION;

    try {
      const { results, total } = await this.workflowsManagement.management.searchStepExecutions(
        {
          workflowId: SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
          stepId: INVESTIGATE_STEP_ID,
          stepType: AI_AGENT_STEP_TYPE,
          workflowExecutionIds: investigationIds,
          sourceIncludes: SEVERITY_SOURCE_INCLUDES,
          size,
        },
        spaceId
      );

      if (total > results.length) {
        this.logger.warn(
          `Severity lookup for ${investigationIds.length} investigations read ${results.length} of ${total} matching step executions; the oldest ones on this page report no severity`
        );
      }

      const stepsByInvestigation = new Map<string, InvestigateStepExecution[]>();
      for (const step of results) {
        const steps = stepsByInvestigation.get(step.workflowRunId) ?? [];
        steps.push(step);
        stepsByInvestigation.set(step.workflowRunId, steps);
      }

      for (const [investigationId, steps] of stepsByInvestigation) {
        const severity = asSeverity(latestInvestigateOutput(steps)?.severity, this.logger);
        if (severity) {
          severityById.set(investigationId, severity);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Could not resolve investigation severities, listing without them: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return severityById;
  }
}
