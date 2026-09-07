/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { PROPOSALS_RESUME_CHANNEL } from '../../common/constants';
import type {
  ActionMetadata,
  ApproveProposalRequest,
  CreateProposalRequest,
  DismissProposalRequest,
  ListProposalsQuery,
  ListProposalsResponse,
  Proposal,
  ProposalStatus,
  ProposalWithMetadata,
} from '../../common/proposal';
import { actionMetadataSchema, isExpired } from '../../common/proposal';
import type { ProposalDocument, ProposalsStorageClient } from '../storage/proposals_storage';
import { ProposalConflictError, ProposalExpiredError, ProposalNotFoundError } from './errors';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

/** The step type the generic gate workflow parks on. */
const GATE_STEP_TYPE = 'waitForApproval';

interface StoredProposal {
  proposal: Proposal;
  seqNo?: number;
  primaryTerm?: number;
}

export interface RecordResultParams {
  id: string;
  status: Extract<ProposalStatus, 'executing' | 'succeeded' | 'failed'>;
  executionError?: string;
}

export interface ProposalsServiceDeps {
  storage: ProposalsStorageClient;
  logger: Logger;
  getWorkflowsApi: () => WorkflowsManagementApi | undefined;
}

/**
 * Owns every write to the proposals index. Decisions are recorded before the
 * gating workflow is resumed, so the record — not the resume payload — is the
 * durable channel for what was decided.
 */
export class ProposalsService {
  constructor(private readonly deps: ProposalsServiceDeps) {}

  async create(
    params: CreateProposalRequest,
    { spaceId, username }: { spaceId: string; username?: string }
  ): Promise<Proposal> {
    const id = uuidv4();
    // Workflow callers reach us through Liquid templates, which render an
    // absent input as an empty string. Left as-is, `expiresAt: ''` is rejected
    // by the `date` mapping and an empty `actionWorkflowId` would make a
    // proposal look action-bearing when it is not.
    const actionWorkflowId = blankToUndefined(params.actionWorkflowId);

    const category = actionWorkflowId
      ? (await this.resolveActionMetadata(actionWorkflowId, spaceId))?.category ?? 'investigate'
      : 'investigate';

    const document: ProposalDocument = {
      spaceId,
      conversationId: params.conversationId,
      comment: blankToUndefined(params.comment),
      actionWorkflowId,
      actionInput: params.actionInput,
      status: 'pending',
      impact: params.impact,
      confidence: params.confidence,
      category,
      targetEntities: (params.targetEntities ?? []).filter(
        (entity) => blankToUndefined(entity) !== undefined
      ),
      origin: params.origin,
      expiresAt: blankToUndefined(params.expiresAt),
      workflowExecutionId: blankToUndefined(params.workflowExecutionId),
      supersedesProposalId: blankToUndefined(params.supersedesProposalId),
      createdAt: new Date().toISOString(),
      createdBy: username,
    };

    await this.deps.storage.index({ id, document, op_type: 'create' });

    return { id, ...document };
  }

  async get(id: string, spaceId: string): Promise<ProposalWithMetadata> {
    const { proposal } = await this.load(id, spaceId);
    return this.withMetadata(proposal, spaceId);
  }

  async list(query: ListProposalsQuery, spaceId: string): Promise<ListProposalsResponse> {
    const filter: QueryFilterList = [{ term: { spaceId } }];

    if (query.status) {
      filter.push({ term: { status: query.status } });
    }
    if (query.conversationId) {
      filter.push({ term: { conversationId: query.conversationId } });
    }
    if (query.targetEntity) {
      filter.push({ term: { targetEntities: query.targetEntity } });
    }

    const response = await this.deps.storage.search({
      track_total_hits: true,
      size: query.size,
      query: { bool: { filter } },
      // Impact and confidence are keywords, so their natural sort is
      // alphabetical; the service ranks them after the fetch instead.
      sort: [{ createdAt: { order: 'desc' } }],
    });

    const proposals = await Promise.all(
      response.hits.hits
        .filter((hit): hit is typeof hit & { _id: string } => hit._id !== undefined)
        .map((hit) =>
          this.withMetadata({ id: hit._id, ...(hit._source as ProposalDocument) }, spaceId)
        )
    );

    return {
      proposals: sortForQueue(proposals),
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? proposals.length,
    };
  }

  /**
   * Records the approval and then releases the gating workflow. Order matters:
   * the workflow only ever receives a boolean, so anything durable has to be
   * written first.
   */
  async approve(
    id: string,
    params: ApproveProposalRequest,
    { spaceId, request, username }: DecisionContext
  ): Promise<Proposal> {
    const { proposal, seqNo, primaryTerm } = await this.load(id, spaceId);

    this.assertDecidable(proposal);

    if (params.actionInput !== undefined && !sameInput(params.actionInput, proposal.actionInput)) {
      throw new ProposalConflictError(
        `Proposal [${id}] was modified since it was rendered; re-read it before approving`
      );
    }

    const decided = await this.writeDecision(
      { ...proposal, status: 'approved', rationale: params.rationale },
      { seqNo, primaryTerm, username }
    );

    await this.resumeGate(decided, { spaceId, request, approved: true });

    return decided;
  }

  /** Same shape as `approve`, but releases the workflow down its negative branch. */
  async dismiss(
    id: string,
    params: DismissProposalRequest,
    { spaceId, request, username }: DecisionContext
  ): Promise<Proposal> {
    const { proposal, seqNo, primaryTerm } = await this.load(id, spaceId);

    this.assertDecidable(proposal);

    const decided = await this.writeDecision(
      {
        ...proposal,
        status: 'dismissed',
        dismissReason: params.dismissReason,
        rationale: params.rationale,
      },
      { seqNo, primaryTerm, username }
    );

    await this.resumeGate(decided, { spaceId, request, approved: false });

    return decided;
  }

  /** Called by the gate workflow once the action workflow has settled. */
  async recordResult(
    { id, status, executionError }: RecordResultParams,
    spaceId: string
  ): Promise<Proposal> {
    const { proposal, seqNo, primaryTerm } = await this.load(id, spaceId);

    const updated: Proposal = { ...proposal, status, executionError };
    const { id: _id, ...document } = updated;

    await this.deps.storage.index({
      id,
      document,
      ...(seqNo !== undefined && primaryTerm !== undefined
        ? { if_seq_no: seqNo, if_primary_term: primaryTerm }
        : {}),
    });

    return updated;
  }

  /**
   * Reads the action workflow's self-declared metadata from `consts.actionMetadata`.
   * Resolved on read so a catalog change is picked up rather than baked into
   * every historical proposal.
   */
  async resolveActionMetadata(
    actionWorkflowId: string,
    spaceId: string
  ): Promise<ActionMetadata | undefined> {
    const api = this.deps.getWorkflowsApi();
    if (!api) {
      return undefined;
    }

    try {
      const workflow = await api.getWorkflow(actionWorkflowId, spaceId);
      const candidate = workflow?.definition?.consts?.actionMetadata;
      if (!candidate) {
        return undefined;
      }

      const parsed = actionMetadataSchema.safeParse(candidate);
      if (!parsed.success) {
        this.deps.logger.warn(
          `Action workflow [${actionWorkflowId}] declares invalid consts.actionMetadata: ${parsed.error.message}`
        );
        return undefined;
      }
      return parsed.data;
    } catch (error) {
      this.deps.logger.warn(
        `Failed to read metadata for action workflow [${actionWorkflowId}]: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return undefined;
    }
  }

  private async load(id: string, spaceId: string): Promise<StoredProposal> {
    // A blank id reaches us when a workflow template resolves to nothing — for
    // instance an on-failure handler firing before the proposal was created.
    // Elasticsearch would answer with an opaque "Ids can't be empty" shard
    // failure, so refuse it here instead.
    if (blankToUndefined(id) === undefined) {
      throw new ProposalNotFoundError(id);
    }

    const response = await this.deps.storage.search({
      track_total_hits: false,
      size: 1,
      seq_no_primary_term: true,
      query: { bool: { filter: [{ ids: { values: [id] } }, { term: { spaceId } }] } },
    });

    const hit = response.hits.hits[0];
    if (!hit?._source || hit._id === undefined) {
      throw new ProposalNotFoundError(id);
    }

    return {
      proposal: { id: hit._id, ...(hit._source as ProposalDocument) },
      seqNo: hit._seq_no,
      primaryTerm: hit._primary_term,
    };
  }

  private assertDecidable(proposal: Proposal): void {
    if (proposal.status !== 'pending') {
      throw new ProposalConflictError(
        `Proposal [${proposal.id}] was already decided (status: ${proposal.status})`
      );
    }
    if (isExpired(proposal)) {
      throw new ProposalExpiredError(proposal.id);
    }
  }

  private async writeDecision(
    proposal: Proposal,
    { seqNo, primaryTerm, username }: { seqNo?: number; primaryTerm?: number; username?: string }
  ): Promise<Proposal> {
    const decided: Proposal = {
      ...proposal,
      // Server-derived; never accepted from the caller.
      decidedBy: username,
      decidedAt: new Date().toISOString(),
    };
    const { id, ...document } = decided;

    try {
      await this.deps.storage.index({
        id,
        document,
        ...(seqNo !== undefined && primaryTerm !== undefined
          ? { if_seq_no: seqNo, if_primary_term: primaryTerm }
          : {}),
      });
    } catch (error) {
      if (isVersionConflict(error)) {
        throw new ProposalConflictError(`Proposal [${id}] was decided by another actor first`);
      }
      throw error;
    }

    return decided;
  }

  /**
   * Releases the parked gate. The waiting step is resolved here and passed
   * explicitly: the platform's own lookup only matches `waitForInput`, and when
   * it resolves nothing it resumes without claiming the step or stamping the
   * audit envelope.
   */
  private async resumeGate(
    proposal: Proposal,
    { spaceId, request, approved }: { spaceId: string; request: KibanaRequest; approved: boolean }
  ): Promise<void> {
    if (!proposal.workflowExecutionId) {
      // Standalone proposal: nothing is waiting on the decision.
      return;
    }

    const api = this.deps.getWorkflowsApi();
    if (!api) {
      this.deps.logger.warn(
        `Cannot resume execution [${proposal.workflowExecutionId}]: workflows management API unavailable`
      );
      return;
    }

    const execution = await api.getWorkflowExecution(proposal.workflowExecutionId, spaceId);
    if (!execution) {
      throw new ProposalConflictError(
        `Execution [${proposal.workflowExecutionId}] for proposal [${proposal.id}] not found`
      );
    }
    if (execution.status !== ExecutionStatus.WAITING_FOR_INPUT || execution.finishedAt) {
      throw new ProposalConflictError(
        `Execution [${proposal.workflowExecutionId}] is not waiting for input (status: ${execution.status})`
      );
    }

    const stepExecutionId = findWaitingGateStepId(execution.stepExecutions);

    await api.resumeWorkflowExecution(
      proposal.workflowExecutionId,
      spaceId,
      { approved },
      request,
      { channel: PROPOSALS_RESUME_CHANNEL, ...(stepExecutionId ? { stepExecutionId } : {}) }
    );
  }

  private async withMetadata(proposal: Proposal, spaceId: string): Promise<ProposalWithMetadata> {
    const action = proposal.actionWorkflowId
      ? await this.resolveActionMetadata(proposal.actionWorkflowId, spaceId)
      : undefined;

    return { ...proposal, action, expired: isExpired(proposal) };
  }
}

interface DecisionContext {
  spaceId: string;
  request: KibanaRequest;
  username?: string;
}

type QueryFilterList = Array<Record<string, unknown>>;

/**
 * Treats an empty or whitespace-only string as absent. Liquid renders a missing
 * workflow input as `''`, which is not the same thing as a value.
 */
const blankToUndefined = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
};

const IMPACT_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const CONFIDENCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const CATEGORY_RANK: Record<string, number> = {
  contain: 0,
  escalate: 1,
  investigate: 2,
  tune: 3,
};

const rank = (table: Record<string, number>, value: string | undefined): number =>
  value !== undefined && value in table ? table[value] : Number.MAX_SAFE_INTEGER;

/**
 * Queue ordering: grouped by category, then by impact and confidence, with the
 * decision deadline as the tiebreak. Done in the service because the stored
 * enums are keywords and would otherwise sort alphabetically.
 */
export const sortForQueue = (proposals: ProposalWithMetadata[]): ProposalWithMetadata[] =>
  [...proposals].sort((a, b) => {
    const byCategory = rank(CATEGORY_RANK, a.category) - rank(CATEGORY_RANK, b.category);
    if (byCategory !== 0) return byCategory;

    const byImpact = rank(IMPACT_RANK, a.impact) - rank(IMPACT_RANK, b.impact);
    if (byImpact !== 0) return byImpact;

    const byConfidence = rank(CONFIDENCE_RANK, a.confidence) - rank(CONFIDENCE_RANK, b.confidence);
    if (byConfidence !== 0) return byConfidence;

    return (a.expiresAt ?? '').localeCompare(b.expiresAt ?? '');
  });

/**
 * The most recently started gate step that has neither finished nor been
 * answered. Mirrors the platform's own waiting-step query, but for
 * `waitForApproval`.
 */
const findWaitingGateStepId = (
  stepExecutions: Array<{
    id: string;
    stepType?: string;
    status: string;
    startedAt: string;
    finishedAt?: string;
    hitl?: { respondedAt?: string };
  }>
): string | undefined =>
  stepExecutions
    .filter(
      (step) =>
        step.stepType === GATE_STEP_TYPE &&
        step.status === ExecutionStatus.WAITING_FOR_INPUT &&
        !step.finishedAt &&
        !step.hitl?.respondedAt
    )
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]?.id;

const sameInput = (
  submitted: Record<string, unknown>,
  stored: Record<string, unknown> | undefined
): boolean => JSON.stringify(submitted ?? {}) === JSON.stringify(stored ?? {});

const isVersionConflict = (error: unknown): boolean => {
  const status = (error as { statusCode?: number; meta?: { statusCode?: number } })?.statusCode;
  const metaStatus = (error as { meta?: { statusCode?: number } })?.meta?.statusCode;
  return status === 409 || metaStatus === 409;
};
