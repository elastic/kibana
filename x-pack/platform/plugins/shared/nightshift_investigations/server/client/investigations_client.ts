/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ExecutionStatus } from '@kbn/workflows';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  GetInvestigationResponse,
  InvestigationStatus,
  InvestigationSubject,
  ListInvestigationItem,
  ListInvestigationsRequest,
  ListInvestigationsResponse,
  StartInvestigationRequest,
  StartInvestigationResponse,
} from '../../common';

import { InvestigationNotFoundError } from './errors';
export { InvestigationNotFoundError };

const SORT_FIELD_MAP: Record<
  NonNullable<ListInvestigationsRequest['sort_field']>,
  'createdAt' | 'finishedAt'
> = {
  created_at: 'createdAt',
  finished_at: 'finishedAt',
};

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
    return { type: 'significant_event', id: String(ctx.significant_event_id ?? '') };
  }
  if (ctx.source === 'alert') {
    return { type: 'alert', id: String(ctx.alert_id ?? '') };
  }
  return undefined;
}

export class NightshiftInvestigationsClient {
  constructor(
    private readonly request: KibanaRequest,
    private readonly workflowsManagement: WorkflowsServerPluginSetup | undefined,
    private readonly spaces: SpacesPluginStart | undefined,
    private readonly logger: Logger,
    // Explicit override for contexts where the request cannot carry space info (e.g. workflow step
    // definitions using getFakeRequest). See https://github.com/elastic/kibana/issues/284786.
    private readonly spaceIdOverride?: string
  ) {}

  private getSpaceId(): string {
    return (
      this.spaceIdOverride ??
      this.spaces?.spacesService.getSpaceId(this.request) ??
      DEFAULT_SPACE_ID
    );
  }

  async start({
    subject,
    concurrency_key,
    context = {},
  }: StartInvestigationRequest): Promise<StartInvestigationResponse> {
    if (!this.workflowsManagement) {
      throw new Error('workflowsManagement is not available');
    }

    const spaceId = this.getSpaceId();
    const workflow = await this.workflowsManagement.management.getWorkflow(
      SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
      spaceId
    );

    if (!workflow?.definition) {
      this.logger.error(
        `Investigation workflow "${SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID}" is not installed in space "${spaceId}"`
      );
      throw new Error('Investigations are not configured in this space');
    }

    const inputs = {
      message: `Investigation requested for ${subject.type} ${subject.id}`,
      ...(concurrency_key ? { concurrency_key } : {}),
      context: {
        ...context,
        source: subject.type,
        [`${subject.type}_id`]: subject.id,
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

    // Step-level output is populated when includeOutput: true. Search in reverse for
    // the last ai.agent step that produced a conclusion or summary. The workflow engine
    // wraps the agent's structured schema output in a `structured_output` envelope, so
    // conclusion/summary live at output.structured_output.{conclusion,summary}, not at
    // the top-level output object. Confirmed by investigation_workflow.yaml line references
    // to `steps.investigate.output.structured_output.*`.
    const conclusionStep = execution.stepExecutions
      ?.slice()
      .reverse()
      .find((s) => {
        if (!isPlainObject(s.output)) return false;
        const structured = s.output.structured_output;
        return isPlainObject(structured) && ('conclusion' in structured || 'summary' in structured);
      });
    const rawOutput = (() => {
      if (!isPlainObject(conclusionStep?.output)) return undefined;
      const structured = conclusionStep.output.structured_output;
      return isPlainObject(structured) ? structured : undefined;
    })();

    const subject = recoverSubjectFromInput(rawInput);

    return {
      investigation_id: investigationId,
      subject: subject ?? { type: 'significant_event', id: '' },
      status,
      started_at: execution.startedAt,
      completed_at: isTerminal ? execution.finishedAt : undefined,
      conclusions:
        status === 'completed'
          ? asString(rawOutput?.conclusion) ?? asString(rawOutput?.summary)
          : undefined,
      error: (() => {
        if (status !== 'failed') return undefined;
        if (execution.error?.message) {
          this.logger.warn(`Investigation "${investigationId}" failed: ${execution.error.message}`);
        }
        return 'Investigation failed';
      })(),
    };
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

    const results: ListInvestigationItem[] = result.results.map((execution) => {
      const status = toInvestigationStatus(execution.status, this.logger);
      const isTerminal = isTerminalStatus(status);
      return {
        investigation_id: execution.id,
        status,
        started_at: execution.startedAt,
        completed_at: isTerminal ? execution.finishedAt : undefined,
        concurrency_key: execution.concurrencyGroupKey,
        executed_by: execution.executedBy,
      };
    });

    return { results, page: result.page, size: result.size, total: result.total };
  }
}
