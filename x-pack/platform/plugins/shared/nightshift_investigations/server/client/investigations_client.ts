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
 */
export interface NightshiftInvestigationRecord {
  id: string;
  spaceId: string;
  solution: string;
  subjectType: InvestigationSubjectType;
  subjectId: string;
  subjectSummary?: string;
  severity?: Severity;
  title?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  conversationId?: string;
  hypotheses?: InvestigationHypothesis[];
  recommendations?: InvestigationRecommendation[];
  blindSpots?: InvestigationBlindSpot[];
  triggerType?: InvestigationTriggerType;
  concurrencyKey?: string;
  executedBy?: string;
  conclusion?: string;
  triggerFeedback?: TriggerFeedback[];
  impact?: InvestigationImpact;
}

/** Document shape for writes — id lives in `_id`. */
type NightshiftInvestigationDoc = Omit<NightshiftInvestigationRecord, 'id'>;

interface NightshiftListQuery {
  severity?: Severity;
  solution?: string;
  subjectType?: InvestigationSubjectType;
  concurrencyKey?: string;
  sortField?: 'createdAt' | 'severity';
  sortOrder?: 'asc' | 'desc';
  size: number;
  from: number;
}

interface NightshiftListResult {
  items: NightshiftInvestigationRecord[];
  total: number;
  severityCounts: Record<string, number>;
}

interface NightshiftSeverityCountsQuery {
  solution?: string;
  subjectType?: InvestigationSubjectType;
}

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
  created_at: record.createdAt,
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
    const spaceId = this.getSpaceId();
    const existing = await this.investigationsService.get(spaceId, investigationId);
    if (existing) {
      return;
    }

    const now = new Date().toISOString();
    await this.investigationsService.upsert(spaceId, {
      conversationId: investigationId,
      spaceId,
      solution: 'observability',
      subjectType: subject.type,
      subjectId: subject.id,
      subjectSummary: subject.summary,
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
   * Ensures the investigation record exists. Called by the workflow's
   * persist_investigation_started step. Creates the SO from the execution document if it
   * doesn't already exist (e.g. when the workflow is triggered without going through start()).
   */
  async ensureOrCreate(investigationId: string): Promise<void> {
    const spaceId = this.getSpaceId();
    const existing = await this.investigationsService.get(spaceId, investigationId);
    if (existing) {
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

    const { subject, triggerType, concurrencyKey } = parseExecutionInvestigationMetadata(
      execution.context
    );

    if (!subject) {
      throw new InvestigationSubjectMissingError(investigationId);
    }

    const startedAt = execution.startedAt ?? new Date().toISOString();
    const now = new Date().toISOString();

    await this.investigationsService.upsert(spaceId, {
      conversationId: investigationId,
      spaceId,
      solution: 'observability',
      subjectType: subject.type,
      subjectId: subject.id,
      subjectSummary: subject.summary,
      triggerType,
      concurrencyKey,
      executedBy: execution.executedBy,
      createdAt: startedAt,
      updatedAt: now,
      hypotheses: [],
      recommendations: [],
      blindSpots: [],
    });
  }

  async update(investigationId: string, state: UpdateInvestigationRequest): Promise<void> {
    const spaceId = this.getSpaceId();
    const existing = await this.investigationsService.get(spaceId, investigationId);
    if (!existing) {
      throw new InvestigationNotFoundError(investigationId);
    }

    const { conversation_id, ...output } = state;

    const now = new Date().toISOString();
    const { id: _id, ...existingDoc } = existing;
    await this.investigationsService.upsert(spaceId, {
      ...existingDoc,
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

  async get(investigationId: string): Promise<GetInvestigationResponse> {
    const spaceId = this.getSpaceId();
    const record = await this.investigationsService.get(spaceId, investigationId);
    if (!record) {
      throw new InvestigationNotFoundError(investigationId);
    }
    return toInvestigationResponse(record);
  }

  async list({
    severities,
    subject_types,
    query: _query,
    concurrency_key,
    created_after: _createdAfter,
    created_before: _createdBefore,
    sort_field,
    sort_order,
    page = 1,
    size = 20,
  }: ListInvestigationsRequest = {}): Promise<ListInvestigationsResponse> {
    const spaceId = this.getSpaceId();

    const sortFieldMapped =
      sort_field === 'created_at' ? 'createdAt' : (sort_field as 'severity' | undefined);

    const result = await this.investigationsService.list(spaceId, {
      severity: severities?.[0],
      subjectType: subject_types?.[0],
      concurrencyKey: concurrency_key,
      sortField: sortFieldMapped,
      sortOrder: sort_order,
      size,
      from: (page - 1) * size,
    });

    return {
      results: result.items.map(toListItem),
      page,
      size,
      total: result.total,
    };
  }

  async getSeverityCounts({
    subject_types,
  }: SeverityCountsRequest = {}): Promise<SeverityCountsResponse> {
    const spaceId = this.getSpaceId();

    const severityCounts = await this.investigationsService.getSeverityCounts(spaceId, {
      subjectType: subject_types?.[0],
      solution: 'observability',
    });

    return { severity_counts: severityCounts as SeverityCounts };
  }
}
