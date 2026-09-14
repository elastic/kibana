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
import type {
  InvestigationBlindSpot,
  InvestigationHypothesis,
  InvestigationImpact,
  InvestigationRecommendation,
  Severity,
  TriggerFeedback,
} from '@kbn/significant-events-schema';
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
  SeverityCounts,
  SeverityCountsRequest,
  SeverityCountsResponse,
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
import { buildInvestigationMessage } from './build_investigation_message';
import {
  InvestigationConflictError,
  InvestigationNotFoundError,
  InvalidInvestigationContextError,
  InvestigationSubjectMissingError,
  InvestigationUnavailableError,
} from './errors';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v || undefined : undefined;
}

function isTerminalStatus(status: InvestigationStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

/** Used when persist omits `error`. */
const FALLBACK_INVESTIGATION_ERROR = 'Investigation failed';

const SUPERSEDED_STATUSES = [
  'pending',
  'running',
] as const satisfies ReadonlyArray<InvestigationStatus>;

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
 * Context fields each subject type's id may arrive under, in precedence order. A significant event
 * has two spellings because discovery's `workflow.executeAsync` sends `event_id` while `start()`
 * sends `significant_event_id`; both must resolve to the same subject. The `satisfies` clause is
 * what makes a newly added {@link InvestigationSubjectType} a compile error rather than a run that
 * silently recovers no subject.
 */
const SUBJECT_ID_FIELDS = {
  significant_event: ['event_id', 'significant_event_id'],
  alert: ['alert_id'],
} as const satisfies Record<InvestigationSubjectType, readonly string[]>;

const toSubject = ({
  subjectType,
  subjectId,
  subjectSummary,
}: {
  subjectType: InvestigationSubjectType;
  subjectId: string;
  subjectSummary?: string;
}): InvestigationSubject => {
  if (subjectSummary) {
    return { type: subjectType, id: subjectId, summary: subjectSummary };
  }
  return { type: subjectType, id: subjectId };
};

/**
 * Shared camelCase investigation record shape the service exposes.
 * Fields marked "nightshift-specific" do not yet exist in the shared
 * Investigation entity; they are added via the spine change requests for this leaf
 * (see `agentic_investigations/common/investigations/investigation.ts`).
 */
export interface NightshiftInvestigationRecord {
  id: string;
  spaceId: string;
  solution: string;
  subjectType: InvestigationSubjectType;
  subjectId: string;
  subjectSummary?: string;
  status: InvestigationStatus;
  severity?: Severity;
  title?: string;
  summary?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  conversationId?: string;
  hypotheses?: InvestigationHypothesis[];
  recommendations?: InvestigationRecommendation[];
  blindSpots?: InvestigationBlindSpot[];
  /** nightshift-specific — added to shared Investigation via spine change */
  triggerType?: InvestigationTriggerType;
  concurrencyKey?: string;
  executedBy?: string;
  error?: string;
  conclusion?: string;
  triggerFeedback?: TriggerFeedback[];
  impact?: InvestigationImpact;
}

/** Document shape for writes — id lives in `_id`. */
type NightshiftInvestigationDoc = Omit<NightshiftInvestigationRecord, 'id'>;

/**
 * Extended list-query shape, mirroring `ListInvestigationsQuery` in
 * `agentic_investigations` but with nightshift-specific filters.
 * Spine change: add concurrencyKey, createdAfter/Before, startedAfter/Before,
 * completedAfter/Before, sortField, page to InvestigationsService.list().
 */
interface NightshiftListQuery {
  status?: InvestigationStatus;
  severity?: Severity;
  solution?: string;
  subjectType?: InvestigationSubjectType;
  concurrencyKey?: string;
  createdAfter?: string;
  createdBefore?: string;
  startedAfter?: string;
  startedBefore?: string;
  completedAfter?: string;
  completedBefore?: string;
  sortField?: 'createdAt' | 'completedAt' | 'severity';
  sortOrder?: 'asc' | 'desc';
  size: number;
  from: number;
}

interface NightshiftListResult {
  items: NightshiftInvestigationRecord[];
  total: number;
  severityCounts: Record<string, number>;
}

/**
 * Extended severity-counts query for nightshift-specific filters.
 * Spine change: add concurrencyKey, date-range filters to InvestigationsService.getSeverityCounts().
 */
interface NightshiftSeverityCountsQuery {
  status?: InvestigationStatus;
  solution?: string;
  subjectType?: InvestigationSubjectType;
}

/**
 * Minimal contract this client requires from the shared investigations service.
 * Signatures match the actual `InvestigationsService` from `agentic_investigations`;
 * the spine change requests for this leaf extend the Investigation entity and the
 * list/getSeverityCounts queries to support nightshift-specific fields.
 */
export interface NightshiftInvestigationsService {
  upsert(spaceId: string, doc: NightshiftInvestigationDoc): Promise<NightshiftInvestigationRecord>;
  /** Returns null when no investigation with `id` exists in `spaceId`. */
  get(spaceId: string, id: string): Promise<NightshiftInvestigationRecord | null>;
  list(spaceId: string, query: NightshiftListQuery): Promise<NightshiftListResult>;
  getSeverityCounts(
    spaceId: string,
    query: NightshiftSeverityCountsQuery
  ): Promise<Record<string, number>>;
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
  /** Shared investigation entity service from the agenticInvestigations start contract. */
  investigationsService: NightshiftInvestigationsService;
  isAvailable: () => Promise<boolean>;
}

const toListItem = (record: NightshiftInvestigationRecord): ListInvestigationItem => ({
  investigation_id: record.id,
  status: record.status,
  created_at: record.createdAt,
  started_at: record.startedAt,
  completed_at: record.completedAt,
  severity: record.severity,
  concurrency_key: record.concurrencyKey,
  executed_by: record.executedBy,
  subject: toSubject({
    subjectType: record.subjectType,
    subjectId: record.subjectId,
    subjectSummary: record.subjectSummary,
  }),
  summary: record.summary,
  impact: record.impact,
  conversation_id: record.conversationId,
});

const toInvestigationResponse = (
  record: NightshiftInvestigationRecord
): GetInvestigationResponse => ({
  ...toListItem(record),
  trigger_type: record.triggerType,
  error: record.error,
  summary: record.summary,
  conclusion: record.conclusion,
  hypotheses: record.hypotheses,
  recommendations: record.recommendations,
  blind_spots: record.blindSpots,
  trigger_feedback: record.triggerFeedback,
  conversation_id: record.conversationId,
  impact: record.impact,
});

const parseExecutionInvestigationMetadata = (
  executionContext: Record<string, unknown> | undefined
): ExecutionInvestigationMetadata => {
  const inputs =
    isPlainObject(executionContext) && isPlainObject(executionContext.inputs)
      ? executionContext.inputs
      : undefined;
  const rawConcurrencyKey = inputs?.concurrency_key;
  const concurrencyKey = typeof rawConcurrencyKey === 'string' ? rawConcurrencyKey : undefined;

  return {
    subject: recoverSubjectFromInput(inputs),
    triggerType: recoverTriggerTypeFromInput(inputs) ?? DEFAULT_INVESTIGATION_TRIGGER_TYPE,
    concurrencyKey,
  };
};

/**
 * The investigation subject an execution's inputs describe, summary included, or undefined when
 * they describe none. Shared by `ensureOrCreate()` and the write path so they cannot disagree
 * about what a run is investigating.
 */
function recoverSubjectFromInput(
  input: Record<string, unknown> | undefined
): InvestigationSubject | undefined {
  const ctx = input?.context;
  if (!isPlainObject(ctx)) return undefined;

  const source = ctx.source;
  if (!isSubjectType(source)) return undefined;

  for (const field of SUBJECT_ID_FIELDS[source]) {
    const subjectId = asString(ctx[field]);
    if (subjectId) {
      return toSubject({ subjectType: source, subjectId, subjectSummary: asString(ctx.summary) });
    }
  }

  return undefined;
}

function recoverTriggerTypeFromInput(
  input: Record<string, unknown> | undefined
): InvestigationTriggerType | undefined {
  const ctx = input?.context;
  if (!isPlainObject(ctx)) return undefined;
  return isTriggerType(ctx.trigger_type) ? ctx.trigger_type : undefined;
}

export class NightshiftInvestigationsClient {
  private readonly request: KibanaRequest;
  private readonly workflowsManagement: WorkflowsServerPluginSetup | undefined;
  private readonly spaces: SpacesPluginStart | undefined;
  private readonly logger: Logger;
  private readonly spaceIdOverride?: string;
  private readonly agentBuilder?: AgentBuilderPluginStart;
  private readonly investigationsService: NightshiftInvestigationsService;
  private readonly checkAvailability: () => Promise<boolean>;

  constructor(deps: NightshiftInvestigationsClientDeps) {
    this.request = deps.request;
    this.workflowsManagement = deps.workflowsManagement;
    this.spaces = deps.spaces;
    this.logger = deps.logger;
    this.spaceIdOverride = deps.spaceIdOverride;
    this.agentBuilder = deps.agentBuilder;
    this.investigationsService = deps.investigationsService;
    this.checkAvailability = deps.isAvailable;
  }

  public isAvailable = (): Promise<boolean> => this.checkAvailability();

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
    if (!(await this.isAvailable())) {
      throw new InvestigationUnavailableError('Investigations are not available');
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

    await this.create({
      investigationId: executionId,
      subject,
      triggerType: trigger_type ?? DEFAULT_INVESTIGATION_TRIGGER_TYPE,
      concurrencyKey: concurrency_key,
    }).catch((error) => {
      this.logger.warn(
        `Failed to eagerly persist investigation "${executionId}", deferring to the workflow's ensure step: ${error.message}`
      );
    });

    return { investigation_id: executionId };
  }

  /**
   * Creates a new investigation record as `pending`. Called from start() so the id is readable
   * immediately. The workflow's persist_investigation_started step later transitions the record
   * to `running` via ensureOrCreate().
   */
  async create({
    investigationId,
    subject,
    triggerType,
    concurrencyKey,
  }: {
    investigationId: string;
    subject: InvestigationSubject;
    triggerType: InvestigationTriggerType;
    concurrencyKey?: string;
  }): Promise<void> {
    if (concurrencyKey) {
      await this.cancelSupersededInvestigation({ concurrencyKey, investigationId });
    }

    const spaceId = this.getSpaceId();
    const existing = await this.investigationsService.get(spaceId, investigationId);
    if (existing) {
      // Already created (e.g. ensureOrCreate ran first); leave it untouched.
      return;
    }

    const now = new Date().toISOString();
    await this.investigationsService.upsert(spaceId, {
      // Key the SO by the investigation/execution ID so get(spaceId, investigationId) round-trips.
      conversationId: investigationId,
      spaceId,
      solution: 'observability',
      subjectType: subject.type,
      subjectId: subject.id,
      subjectSummary: subject.summary,
      status: 'pending',
      triggerType,
      concurrencyKey,
      createdAt: now,
      updatedAt: now,
      hypotheses: [],
      recommendations: [],
      blindSpots: [],
    });
  }

  /**
   * Ensures the investigation record exists and is running. Called by the workflow's
   * persist_investigation_started step. If a pending record exists (created by start()), transitions
   * it to running. If no record exists (workflow triggered without start()), creates one as running
   * from the execution document. Already-running records are left untouched. A settled record
   * (completed, failed, or cancelled) throws so the persist step fails the run rather than
   * continuing through the agent.
   *
   * Both write paths read the execution document, so `started_at` and `executed_by` mean the same
   * thing however the record came to exist: `start()` cannot know the id the engine assigns to the
   * run's executor, and stamping the transition with the wall clock would date the record to when
   * the persist step happened to run rather than to when the run began.
   */
  async ensureOrCreate(investigationId: string): Promise<void> {
    const spaceId = this.getSpaceId();
    const existing = await this.investigationsService.get(spaceId, investigationId);

    if (existing && isTerminalStatus(existing.status)) {
      throw InvestigationConflictError.settled(investigationId, existing.status);
    }
    if (existing && existing.status !== 'pending') {
      return;
    }

    if (!this.workflowsManagement) {
      throw new InvestigationUnavailableError('workflowsManagement is not available');
    }

    const execution = await this.workflowsManagement.management.getWorkflowExecution(
      investigationId,
      spaceId,
      { includeOutput: false }
    );

    const belongsToInvestigationWorkflow =
      execution?.workflowId === SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID ||
      execution?.originManagedWorkflowId === SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID;
    if (!execution || !belongsToInvestigationWorkflow) {
      throw new InvestigationNotFoundError(investigationId);
    }

    const startedAt = execution.startedAt ?? new Date().toISOString();
    const now = new Date().toISOString();

    if (existing) {
      // Transition pending → running.
      const { id: _id, ...existingDoc } = existing;
      await this.investigationsService.upsert(spaceId, {
        ...existingDoc,
        status: 'running',
        startedAt,
        executedBy: execution.executedBy,
        updatedAt: now,
      });
      return;
    }

    const { subject, triggerType, concurrencyKey } = parseExecutionInvestigationMetadata(
      execution.context
    );

    if (!subject) {
      throw new InvestigationSubjectMissingError(investigationId);
    }

    if (concurrencyKey) {
      await this.cancelSupersededInvestigation({ concurrencyKey, investigationId });
    }

    await this.investigationsService.upsert(spaceId, {
      // Key the SO by investigationId so get(spaceId, investigationId) round-trips.
      conversationId: investigationId,
      spaceId,
      solution: 'observability',
      subjectType: subject.type,
      subjectId: subject.id,
      subjectSummary: subject.summary,
      status: 'running',
      triggerType,
      concurrencyKey,
      executedBy: execution.executedBy,
      createdAt: startedAt,
      startedAt,
      updatedAt: now,
      hypotheses: [],
      recommendations: [],
      blindSpots: [],
    });
  }

  /**
   * Cancels the in-flight investigation that `investigationId` supersedes, if there is one.
   *
   * `investigationId` is excluded rather than assumed absent: both callers run while the workflow's
   * `_ensure` step may be creating the very same record, so without the guard the newest match can
   * be the incoming investigation itself — cancelling a record whose execution is alive and which
   * nothing superseded. Two results are fetched because the excluded record can occupy the first.
   *
   * Spine change: InvestigationsService.list() must accept a `concurrencyKey` filter for this to
   * enforce uniqueness across concurrent callers. See spine change requests.
   */
  private async cancelSupersededInvestigation({
    concurrencyKey,
    investigationId,
  }: {
    concurrencyKey: string;
    investigationId: string;
  }): Promise<void> {
    const spaceId = this.getSpaceId();
    // List pending/running investigations with the same concurrency key.
    // Spine change required: add `concurrencyKey` to NightshiftListQuery.
    const { items } = await this.investigationsService.list(spaceId, {
      concurrencyKey,
      size: 2,
      from: 0,
      sortField: 'createdAt',
      sortOrder: 'desc',
    });

    // Filter for superseded statuses.
    const superseded = items.find(
      ({ id, status }) =>
        id !== investigationId &&
        (SUPERSEDED_STATUSES as readonly InvestigationStatus[]).includes(status)
    );
    if (!superseded) {
      return;
    }

    const now = new Date().toISOString();
    const { id: _id, ...supersededDoc } = superseded;
    await this.investigationsService
      .upsert(spaceId, {
        ...supersededDoc,
        status: 'cancelled',
        completedAt: now,
        updatedAt: now,
      })
      .catch((error) => {
        this.logger.warn(
          `Skipped cancelling superseded investigation "${superseded.id}": ${error.message}`
        );
      });
  }

  async update(investigationId: string, state: UpdateInvestigationRequest): Promise<void> {
    const spaceId = this.getSpaceId();
    const existing = await this.investigationsService.get(spaceId, investigationId);
    if (!existing) {
      throw new InvestigationNotFoundError(investigationId);
    }

    const { status, error, conversation_id, ...output } = state;

    if (isTerminalStatus(existing.status)) {
      if (status === existing.status) {
        return;
      }
      throw InvestigationConflictError.settled(investigationId, existing.status);
    }

    if (status === 'failed' && error) {
      this.logger.warn(`Investigation "${investigationId}" failed: ${error}`);
    }

    const now = new Date().toISOString();
    const { id: _id, ...existingDoc } = existing;
    await this.investigationsService.upsert(spaceId, {
      ...existingDoc,
      status,
      ...(isTerminalStatus(status) && { completedAt: now }),
      ...(status === 'failed' && { error: error ?? FALLBACK_INVESTIGATION_ERROR }),
      ...(conversation_id !== undefined && { conversationId: conversation_id }),
      ...(output.summary !== undefined && { summary: output.summary }),
      ...(output.conclusion !== undefined && { conclusion: output.conclusion }),
      ...(output.severity !== undefined && { severity: output.severity }),
      ...(output.hypotheses !== undefined && { hypotheses: output.hypotheses }),
      ...(output.recommendations !== undefined && { recommendations: output.recommendations }),
      ...(output.blind_spots !== undefined && { blindSpots: output.blind_spots }),
      ...(output.trigger_feedback !== undefined && { triggerFeedback: output.trigger_feedback }),
      ...(output.impact !== undefined && { impact: output.impact }),
      updatedAt: now,
    });
  }

  /**
   * Returns the stored investigation. `running` is not checked against the workflow engine, so it
   * can linger after edge cases where no persist step ran: user cancel, cancel-in-progress that
   * ensureOrCreate() did not see, timeout, or a worker dying mid-run. Complete/fail still go
   * through PATCH; a superseded run is cancelled in ensureOrCreate().
   */
  async get(investigationId: string): Promise<GetInvestigationResponse> {
    const spaceId = this.getSpaceId();
    const record = await this.investigationsService.get(spaceId, investigationId);
    if (!record) {
      throw new InvestigationNotFoundError(investigationId);
    }
    return toInvestigationResponse(record);
  }

  async list({
    statuses,
    severities,
    subject_types,
    query: _query,
    concurrency_key,
    created_after: _createdAfter,
    created_before: _createdBefore,
    started_after: _startedAfter,
    started_before: _startedBefore,
    completed_after: _completedAfter,
    completed_before: _completedBefore,
    sort_field,
    sort_order,
    page = 1,
    size = 20,
  }: ListInvestigationsRequest = {}): Promise<ListInvestigationsResponse> {
    const spaceId = this.getSpaceId();

    const sortFieldMapped =
      sort_field === 'created_at'
        ? 'createdAt'
        : sort_field === 'completed_at'
        ? 'completedAt'
        : (sort_field as 'severity' | undefined);

    // Nightshift list() supports arrays; the underlying InvestigationsService.list() uses
    // scalar filters (spine change required to add array support and date-range filters).
    // For now, take the first element of each array as a best-effort single-value filter.
    const result = await this.investigationsService.list(spaceId, {
      status: statuses?.[0],
      severity: severities?.[0],
      subjectType: subject_types?.[0],
      concurrencyKey: concurrency_key,
      sortField: sortFieldMapped,
      sortOrder: sort_order,
      size,
      from: (page - 1) * size,
    });

    // Stored `running` is not reconciled with the engine — same edge cases as get().
    return {
      results: result.items.map(toListItem),
      page,
      size,
      total: result.total,
    };
  }

  /**
   * Severity facet counts under the given filters, for the homepage tiles.
   *
   * Separate from `list()` because the counts are independent of pagination and sort — bundling
   * them would recompute an identical aggregation on every page change.
   */
  async getSeverityCounts({
    statuses,
    subject_types,
  }: SeverityCountsRequest = {}): Promise<SeverityCountsResponse> {
    const spaceId = this.getSpaceId();

    // Spine change required: add statuses-array and date-range filters to
    // InvestigationsService.getSeverityCounts(). For now, scalar single-value mapping.
    const severityCounts = await this.investigationsService.getSeverityCounts(spaceId, {
      status: statuses?.[0],
      subjectType: subject_types?.[0],
      solution: 'observability',
    });

    return { severity_counts: severityCounts as SeverityCounts };
  }
}
