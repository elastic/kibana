/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import type {
  AlertInvestigationContext,
  GetInvestigationResponse,
  InvestigationContext,
  InvestigationStatus,
  InvestigationSubject,
  InvestigationSubjectType,
  InvestigationTriggerType,
  ListInvestigationItem,
  ListInvestigationsRequest,
  ListInvestigationsResponse,
  UpdateInvestigationRequest,
  StartInvestigationRequest,
  StartInvestigationResponse,
} from '../../common';
import {
  alertInvestigationContextSchema,
  DEFAULT_INVESTIGATION_TRIGGER_TYPE,
  freeFormContextSchema,
  INVESTIGATION_SUBJECT_TYPES,
  INVESTIGATION_TRIGGER_TYPES,
} from '../../common';
import type {
  InvestigationAttributes,
  InvestigationPatch,
  InvestigationRecord,
  InvestigationRepository,
} from '../storage';
import { InvestigationAlreadyExistsError, InvestigationStaleWriteError } from '../storage';
import { buildInvestigationMessage } from './build_investigation_message';
import {
  InvestigationConflictError,
  InvestigationNotFoundError,
  InvalidInvestigationContextError,
  InvestigationSubjectMissingError,
  InvestigationUnavailableError,
} from './errors';

/** Used when persist omitted `error`. */
const FALLBACK_INVESTIGATION_ERROR = 'Investigation failed';

const LIST_RECORD_FIELDS = [
  'completed_at',
  'concurrency_key',
  'created_at',
  'error',
  'executed_by',
  'status',
  'subject_id',
  'subject_summary',
  'subject_type',
  'summary',
  'trigger_type',
] as const satisfies ReadonlyArray<keyof InvestigationAttributes>;

const SUPERSEDED_STATUSES = [
  'pending',
  'running',
] as const satisfies ReadonlyArray<InvestigationStatus>;

function toSubject({
  subjectType,
  subjectId,
  subjectSummary,
}: {
  subjectType: InvestigationSubjectType;
  subjectId: string;
  subjectSummary?: string;
}): InvestigationSubject {
  if (subjectSummary) {
    return { type: subjectType, id: subjectId, summary: subjectSummary };
  }
  return { type: subjectType, id: subjectId };
}

function toListInvestigationItem(record: InvestigationRecord): ListInvestigationItem {
  return {
    investigation_id: record.id,
    subject: toSubject({
      subjectType: record.subject_type,
      subjectId: record.subject_id,
      subjectSummary: record.subject_summary,
    }),
    trigger_type: record.trigger_type,
    status: record.status,
    started_at: record.created_at,
    completed_at: record.completed_at,
    concurrency_key: record.concurrency_key,
    executed_by: record.executed_by,
    error: record.error,
    summary: record.summary,
  };
}

function toInvestigationResponse(record: InvestigationRecord): GetInvestigationResponse {
  return {
    ...toListInvestigationItem(record),
    conclusion: record.conclusion,
    hypotheses: record.hypotheses,
    recommendations: record.recommendations,
    blind_spots: record.blind_spots,
    significant_event_updates: record.significant_event_updates,
    conversation_id: record.conversation_id,
    impact: record.impact,
  };
}

function isTerminalStatus(status: InvestigationStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSubjectType = (value: unknown): value is InvestigationSubjectType =>
  typeof value === 'string' && INVESTIGATION_SUBJECT_TYPES.some((type) => type === value);

const isTriggerType = (value: unknown): value is InvestigationTriggerType =>
  typeof value === 'string' && INVESTIGATION_TRIGGER_TYPES.some((type) => type === value);

interface ExecutionInvestigationMetadata {
  subject?: InvestigationSubject;
  triggerType: InvestigationTriggerType;
  concurrencyKey?: string;
}

/**
 * Extracts the investigation metadata that start() encodes into the workflow inputs
 * (see the `inputs` object built there) back out of a workflow execution document.
 */
function parseExecutionInvestigationMetadata(
  executionContext: Record<string, unknown> | undefined
): ExecutionInvestigationMetadata {
  const inputs =
    isRecord(executionContext) && isRecord(executionContext.inputs)
      ? executionContext.inputs
      : undefined;
  const inputContext = inputs && isRecord(inputs.context) ? inputs.context : undefined;

  const rawSource = inputContext?.source;
  let subject: InvestigationSubject | undefined;
  if (isSubjectType(rawSource)) {
    const rawSubjectId = inputContext?.[`${rawSource}_id`];
    if (typeof rawSubjectId === 'string' && rawSubjectId.length > 0) {
      const rawSummary = inputContext?.summary;
      const subjectSummary =
        typeof rawSummary === 'string' && rawSummary.length > 0 ? rawSummary : undefined;
      subject = toSubject({
        subjectType: rawSource,
        subjectId: rawSubjectId,
        subjectSummary,
      });
    }
  }

  const rawTriggerType = inputContext?.trigger_type;
  const triggerType = isTriggerType(rawTriggerType)
    ? rawTriggerType
    : DEFAULT_INVESTIGATION_TRIGGER_TYPE;

  const rawConcurrencyKey = inputs?.concurrency_key;
  const concurrencyKey = typeof rawConcurrencyKey === 'string' ? rawConcurrencyKey : undefined;

  return { subject, triggerType, concurrencyKey };
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
  investigationRepository: InvestigationRepository;
}

export class NightshiftInvestigationsClient {
  private readonly request: KibanaRequest;
  private readonly workflowsManagement: WorkflowsServerPluginSetup | undefined;
  private readonly spaces: SpacesPluginStart | undefined;
  private readonly logger: Logger;
  private readonly spaceIdOverride?: string;
  private readonly agentBuilder?: AgentBuilderPluginStart;
  private readonly investigationRepository: InvestigationRepository;

  constructor(deps: NightshiftInvestigationsClientDeps) {
    this.request = deps.request;
    this.workflowsManagement = deps.workflowsManagement;
    this.spaces = deps.spaces;
    this.logger = deps.logger;
    this.spaceIdOverride = deps.spaceIdOverride;
    this.agentBuilder = deps.agentBuilder;
    this.investigationRepository = deps.investigationRepository;
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

    await this.ensure(executionId).catch((error) => {
      this.logger.warn(
        `Failed to eagerly persist investigation "${executionId}", deferring to the workflow's ensure step: ${error.message}`
      );
    });

    return { investigation_id: executionId };
  }

  /**
   * Creates the investigation record for a workflow execution if it does not exist yet.
   * Called from start() so the id is readable immediately, and by the workflow's
   * persist_investigation_started step so runs that skipped start() are still tracked. Idempotent so
   * replays and concurrent calls are safe.
   */
  async ensure(investigationId: string): Promise<void> {
    const existing = await this.investigationRepository.get(investigationId);
    if (existing) {
      return;
    }

    if (!this.workflowsManagement) {
      throw new InvestigationUnavailableError('workflowsManagement is not available');
    }

    const spaceId = this.getSpaceId();
    const execution = await this.workflowsManagement.management.getWorkflowExecution(
      investigationId,
      spaceId,
      { includeOutput: false }
    );

    // Identity comes from the execution document, never from the request, so a caller cannot
    // mint investigation records out of nonexistent or unrelated workflow executions.
    const belongsToInvestigationWorkflow =
      execution?.workflowId === SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID ||
      execution?.originManagedWorkflowId === SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID;
    if (!execution || !belongsToInvestigationWorkflow) {
      throw new InvestigationNotFoundError(investigationId);
    }

    const { subject, triggerType, concurrencyKey } = parseExecutionInvestigationMetadata(
      execution.context
    );

    // An investigation without a subject is meaningless to the API (entity filtering,
    // sig-event attachment, alert linkage all presume one), so fail the run loudly —
    // the step error in the workflow executions UI tells the caller what to pass.
    if (!subject) {
      throw new InvestigationSubjectMissingError(investigationId);
    }

    if (concurrencyKey) {
      await this.cancelSupersededInvestigation({ concurrency_key: concurrencyKey });
    }

    try {
      await this.investigationRepository.create({
        id: investigationId,
        attributes: {
          investigation_id: investigationId,
          status: 'running',
          subject_type: subject.type,
          subject_id: subject.id,
          ...(subject.summary ? { subject_summary: subject.summary } : {}),
          trigger_type: triggerType,
          concurrency_key: concurrencyKey,
          executed_by: execution.executedBy,
          created_at: execution.startedAt ?? new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof InvestigationAlreadyExistsError) {
        return;
      }
      throw error;
    }
  }

  private async cancelSupersededInvestigation({
    concurrency_key,
  }: {
    concurrency_key: string;
  }): Promise<void> {
    const { results } = await this.investigationRepository.find({
      concurrencyKey: concurrency_key,
      statuses: [...SUPERSEDED_STATUSES],
      sortField: 'created_at',
      sortOrder: 'desc',
      perPage: 1,
    });
    const superseded = results[0];

    if (!superseded) {
      return;
    }

    try {
      await this.investigationRepository.update(
        superseded.id,
        {
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        },
        { version: superseded.version }
      );
    } catch (error) {
      if (error instanceof InvestigationStaleWriteError) {
        this.logger.warn(
          `Skipped cancelling superseded investigation "${superseded.id}": it was concurrently modified`
        );
        return;
      }
      throw error;
    }
  }

  async update(investigationId: string, state: UpdateInvestigationRequest): Promise<void> {
    const existing = await this.investigationRepository.get(investigationId);
    if (!existing) {
      throw new InvestigationNotFoundError(investigationId);
    }

    const { status, error, ...output } = state;

    if (isTerminalStatus(existing.status)) {
      // Replaying the same terminal status is an idempotent success — the workflow persist
      // steps retry when a response is lost. Anything else (a late progress report, a
      // superseded run's final persist) must not overwrite a settled record.
      if (status === existing.status) {
        return;
      }
      throw InvestigationConflictError.settled(investigationId, existing.status);
    }

    if (status === 'failed' && error) {
      this.logger.warn(`Investigation "${investigationId}" failed: ${error}`);
    }

    const patch: InvestigationPatch = {
      status,
      ...(isTerminalStatus(status) && { completed_at: new Date().toISOString() }),
      ...(status === 'failed' && { error: error ?? FALLBACK_INVESTIGATION_ERROR }),
      ...output,
    };

    try {
      await this.investigationRepository.update(investigationId, patch, {
        version: existing.version,
      });
    } catch (err) {
      if (err instanceof InvestigationStaleWriteError) {
        throw InvestigationConflictError.concurrentlyModified(investigationId);
      }
      throw err;
    }
  }

  /**
   * Returns the stored investigation. `running` is not checked against the workflow engine, so it
   * can linger after edge cases where no persist step ran: user cancel, cancel-in-progress that
   * ensure() did not see, timeout, or a worker dying mid-run. Complete/fail still go through
   * PATCH; a superseded run is cancelled in ensure().
   */
  async get(investigationId: string): Promise<GetInvestigationResponse> {
    const record = await this.investigationRepository.get(investigationId);

    if (!record) {
      throw new InvestigationNotFoundError(investigationId);
    }

    return toInvestigationResponse(record);
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
    const result = await this.investigationRepository.find({
      statuses,
      createdAfter: started_after,
      createdBefore: started_before,
      completedAfter: finished_after,
      completedBefore: finished_before,
      sortField: sort_field === 'finished_at' ? 'completed_at' : 'created_at',
      sortOrder: sort_order,
      page,
      perPage: size,
      fields: [...LIST_RECORD_FIELDS],
    });

    // Stored `running` is not reconciled with the engine — same edge cases as get().
    return {
      results: result.results.map((record) => toListInvestigationItem(record)),
      page: result.page,
      size: result.size,
      total: result.total,
    };
  }
}
