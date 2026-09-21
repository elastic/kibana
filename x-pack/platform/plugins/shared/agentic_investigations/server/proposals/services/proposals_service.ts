/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { asyncMapWithLimit } from '@kbn/std';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import type { JSONSchema7 } from 'json-schema';
import {
  ACTION_WORKFLOW_INPUT,
  actionMetadataSchema,
  convertJsonSchemaToZod,
  ExecutionStatus,
  isHitlWaitStepType,
} from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ActionMetadata } from '@kbn/workflows';
import { PROPOSALS_RESUME_CHANNEL } from '../../../common/proposals/constants';
import type { ChartsWindow } from './esql';
import {
  anchorQuery,
  bucketedEventQuery,
  currentOpenQuery,
  ESQL_RESULT_TRUNCATION_MAX_SIZE,
} from './esql';
import type {
  CreateProposalRequest,
  DismissReason,
  ListByWindowQuery,
  ListProposalsQuery,
  ListProposalsResponse,
  Proposal,
  ProposalChartsSummaryBucket,
  ProposalChartsSummaryQuery,
  ProposalChartsSummaryResponse,
  ProposalDecision,
  ProposalFilters,
  ProposalsListResponse,
  ProposalStatus,
  ProposalUser,
  ProposalWithMetadata,
} from '../../../common/proposals/proposal';
import { isExpired, MAX_PROPOSALS_SIZE } from '../../../common/proposals/proposal';
import type { ProposalDocument, ProposalsStorageClient } from '../storage/proposals_storage';
import { toSortRanks } from '../storage/sort_ranks';
import {
  ProposalConflictError,
  ProposalExpiredError,
  ProposalInvalidActionInputError,
  ProposalNotFoundError,
} from './errors';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

/** The parts of an action workflow definition this service reads. */
interface ActionWorkflowDefinition {
  consts?: { actionMetadata?: unknown };
  triggers?: Array<{ type?: string; inputs?: { properties?: Record<string, unknown> } }>;
}

/**
 * The stored document plus its id. Writers thread this through unchanged so the
 * sort ranks survive an update; only the public returns strip them.
 */
type StoredProposalRecord = { id: string } & ProposalDocument;

interface StoredProposal {
  proposal: StoredProposalRecord;
  seqNo?: number;
  primaryTerm?: number;
}

/**
 * Every field the gate workflow can advance. All optional: a call may move the
 * status, record the decision, or annotate, and the guards in `update` decide
 * whether the resulting pair is legal.
 */
export interface UpdateProposalParams {
  id: string;
  status?: ProposalStatus;
  decision?: ProposalDecision;
  decidedBy?: ProposalUser;
  dismissReason?: DismissReason;
  rationale?: string;
  executionError?: string;
}

export interface ProposalsServiceDeps {
  storage: ProposalsStorageClient;
  logger: Logger;
  getWorkflowsApi: () => WorkflowsManagementApi;
}

/**
 * Owns every write to the proposals index, and the invariants that go with it:
 * a settled status cannot move, a decision cannot be overwritten, and only the
 * legal decision/status pairs can be stored.
 *
 * The decision itself is written by the gate workflow rather than here, because
 * every resume surface funnels through the gate — so a single write behind it
 * covers the API, the workflows resume route, the Inbox and Agent Builder at
 * once. The routes only release the gate.
 */
export class ProposalsService {
  constructor(private readonly deps: ProposalsServiceDeps) {}

  async create(
    params: CreateProposalRequest,
    { spaceId, user }: { spaceId: string; user?: ProposalUser }
  ): Promise<Proposal> {
    const id = uuidv4();
    // Workflow callers reach us through Liquid templates, which render an
    // absent input as an empty string. Left as-is, `expiresAt: ''` is rejected
    // by the `date` mapping and an empty `actionWorkflowId` would make a
    // proposal look action-bearing when it is not.
    const actionWorkflowId = blankToUndefined(params.actionWorkflowId);

    // A single fetch of the action definition serves three purposes: the queue
    // grouping, the impact (intrinsic to the action rather than to the situation
    // that produced it), and rejecting an `actionInput` the action could not
    // accept — before an analyst is asked to approve something that cannot run.
    const metadata = actionWorkflowId
      ? await this.resolveAndValidateAction(actionWorkflowId, params.actionInput, spaceId)
      : undefined;

    // Caller first in both: it knows the situation the proposal came out of,
    // which the action's own metadata cannot. A category can end up absent —
    // the vocabulary belongs to the solution that authored the action — but
    // impact cannot, because it is the queue's primary sort key.
    //
    // Blanked first, and not defensively: `??` treats the `''` that Liquid
    // renders for an absent workflow input as a value, so without this the
    // caller always "wins" with an empty string, the action's own metadata is
    // never consulted, and the queue silently drops a proposal it cannot group.
    const category = blankToUndefined(params.category) ?? metadata?.category;
    const impact = blankToUndefined(params.impact) ?? metadata?.impact ?? 'low';
    // Both are required on the stored document, so a blank has to resolve to
    // something rather than to an omission: `confidence` feeds the queue's
    // secondary sort rank, and `origin` says who proposed it.
    const confidence = blankToUndefined(params.confidence) ?? 'medium';
    const origin = blankToUndefined(params.origin) ?? 'worker';

    const document: ProposalDocument = {
      spaceId,
      conversationId: params.conversationId,
      comment: params.comment,
      actionWorkflowId,
      actionInput: params.actionInput,
      status: 'pending',
      impact,
      confidence,
      category,
      origin,
      ...toSortRanks({ impact, confidence }),
      expiresAt: blankToUndefined(params.expiresAt),
      workflowExecutionId: blankToUndefined(params.workflowExecutionId),
      createdAt: new Date().toISOString(),
      createdBy: user,
    };

    await this.deps.storage.index({ id, document, op_type: 'create' });

    return toProposal(id, document);
  }

  async get(id: string, spaceId: string): Promise<ProposalWithMetadata> {
    const { proposal } = await this.load(id, spaceId);
    return this.withMetadata(stripRanks(proposal), spaceId);
  }

  /**
   * Ordering and paging both happen in Elasticsearch. The queue's order is
   * impact, then confidence, then the nearest deadline — which the stored rank
   * fields express, because the keyword enums would otherwise sort
   * alphabetically. Doing it here rather than in memory is what makes the list
   * pageable instead of capped at a single fetch. Category is not part of the
   * order: a UI groups by it and decides for itself which group leads.
   */
  async list(
    query: ListProposalsQuery,
    spaceId: string,
    /** Replaces the default priority sort; the queues page by recency instead. */
    sort?: SortCombinations[]
  ): Promise<ListProposalsResponse> {
    const filter = toFilterClauses(query, spaceId);

    // Not in the shared translator: `listByWindow` reads decidedAt as one arm of
    // a disjunction, where a conjunctive clause would drop every awaiting proposal.
    if (query.decidedWithinHours !== undefined) {
      filter.push({ range: { decidedAt: { gte: `now-${query.decidedWithinHours}h` } } });
    }

    const response = await this.deps.storage.search({
      track_total_hits: true,
      size: query.size,
      from: query.from,
      query: { bool: { filter } },
      sort: sort ?? [
        { impactRank: { order: 'asc' } },
        { confidenceRank: { order: 'asc' } },
        // Soonest deadline first; proposals without one come after those with.
        { expiresAt: { order: 'asc', missing: '_last' } },
        // Final tiebreak, so paging over equally-ranked proposals is stable.
        { createdAt: { order: 'desc' } },
      ],
    });

    const proposals = await Promise.all(
      response.hits.hits
        .filter((hit): hit is typeof hit & { _id: string } => hit._id !== undefined)
        .map((hit) =>
          this.withMetadata(toProposal(hit._id, hit._source as ProposalDocument), spaceId)
        )
    );

    return {
      proposals,
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? proposals.length,
    };
  }

  /**
   * An activity view: everything still awaiting a decision, at any age, plus
   * everything decided within the last N hours. In creation order, capped
   * rather than paged.
   *
   * It is a separate method because the two halves are a disjunction — "still
   * awaiting" and "decided recently" are unrelated conditions, so neither can
   * be expressed as one more filter on top of `list()`. The shared filters in
   * `ProposalFilters` apply to both halves and mean exactly what they mean in
   * `list()`; only the union and the paging differ.
   *
   * Expired proposals fall out of both halves on their own: the awaiting half
   * matches on `status: 'pending'`, and the decided half needs a `decidedAt`
   * that a proposal nobody answered never got.
   *
   * No HTTP route, because a capped read with no paging is not a contract worth
   * exposing; in-process callers reach it through the start contract.
   *
   * Action-metadata resolution is memoised per `actionWorkflowId` across the
   * entire result set to avoid a `getWorkflow` fetch per proposal.
   */
  async listByWindow(query: ListByWindowQuery, spaceId: string): Promise<ProposalsListResponse> {
    const response = await this.deps.storage.search({
      track_total_hits: true,
      size: MAX_PROPOSALS_SIZE,
      query: {
        bool: {
          filter: toFilterClauses(query, spaceId),
          should: [
            // `pending` is only ever valid while undecided, so the status is
            // the whole condition.
            { term: { status: 'pending' } },
            { range: { decidedAt: { gte: `now-${query.decidedWithinHours}h` } } },
          ],
          minimum_should_match: 1,
        },
      },
      sort: [{ createdAt: { order: 'asc' } }],
    });

    const hits = response.hits.hits.filter(
      (hit): hit is typeof hit & { _id: string } => hit._id !== undefined
    );
    const rawProposals = hits.map((hit) => toProposal(hit._id, hit._source as ProposalDocument));

    const proposals = await this.withMetadataBatch(rawProposals, spaceId);

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? proposals.length;

    return { proposals, total, truncated: total > proposals.length };
  }

  /**
   * Per bucket, how many proposals were open at any point during it. Open means
   * `status: 'pending'`, so an expiry closes a proposal the same way a decision
   * does. An anchor count seeds a running sum that opens and closes then move,
   * keeping this to four queries rather than one per bucket.
   */
  async chartsSummary(
    { windowHours, bucketMinutes }: ProposalChartsSummaryQuery,
    spaceId: string
  ): Promise<ProposalChartsSummaryResponse> {
    const now = Date.now();
    const bucketMs = bucketMinutes * 60 * 1000;
    const windowStartMs = Math.floor((now - windowHours * 60 * 60 * 1000) / bucketMs) * bucketMs;
    const windowStartIso = new Date(windowStartMs).toISOString();
    // +1 so the window always ends at or after `now` even after flooring.
    const bucketCount = Math.floor((now - windowStartMs) / bucketMs) + 1;

    const zeroBuckets = (): ProposalChartsSummaryResponse => ({
      buckets: Array.from({ length: bucketCount }, (_, i) => ({
        timestamp: windowStartMs + i * bucketMs,
        counts: {},
      })),
      currentOpen: 0,
    });

    const window: ChartsWindow = { spaceId, windowStartIso, bucketMinutes };

    let anchorResponse;
    let opensResponse;
    let closesResponse;
    let currentOpenResponse;
    try {
      [anchorResponse, opensResponse, closesResponse, currentOpenResponse] = await Promise.all([
        this.deps.storage.esql({ pipeline: anchorQuery(window) }),
        this.deps.storage.esql({ pipeline: bucketedEventQuery('opens', window) }),
        this.deps.storage.esql({ pipeline: bucketedEventQuery('closes', window) }),
        this.deps.storage.esql({ pipeline: currentOpenQuery(window) }),
      ]);
    } catch (error) {
      // An index created outside the storage adapter can be missing a field this
      // queries, which ES|QL rejects rather than treating as null. Read *that*
      // case as "no data" so the UI flatlines instead of 500ing; every other
      // verification failure is a genuine query defect and must propagate.
      if (isEsqlUnknownColumnError(error)) {
        this.deps.logger.warn(
          `chartsSummary: ES|QL reported an unknown column — returning zero buckets. ` +
            `Recreate the index via the proposals write path to fix the mapping. Error: ${error.message}`
        );
        return zeroBuckets();
      }
      throw error;
    }

    this.warnIfTruncated(opensResponse, 'opens');
    this.warnIfTruncated(closesResponse, 'closes');

    const anchorByCat = parseEsqlCountByCategory(anchorResponse, 'anchor');
    const opensByIdxAndCat = parseEsqlCountByIdxAndCategory(opensResponse, 'opens');
    const closesByIdxAndCat = parseEsqlCountByIdxAndCategory(closesResponse, 'closes');

    const runningSums: Record<string, number> = { ...anchorByCat };
    const buckets: ProposalChartsSummaryBucket[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const timestamp = windowStartMs + i * bucketMinutes * 60_000;

      for (const [cat, count] of Object.entries(opensByIdxAndCat[i] ?? {})) {
        runningSums[cat] = (runningSums[cat] ?? 0) + count;
      }

      // Snapshotted after opens but before closes: those two sets are disjoint,
      // so this is exactly the count open at some point in the bucket. A
      // proposal that opened and closed inside one bucket would otherwise net to
      // zero and never appear.
      const openDuring: Record<string, number> = { ...runningSums };

      for (const [cat, count] of Object.entries(closesByIdxAndCat[i] ?? {})) {
        // Clamped because a close whose open the anchor missed would go negative.
        runningSums[cat] = Math.max(0, (runningSums[cat] ?? 0) - count);
      }

      // Keeps the key set stable: a category whose only event here was a close
      // is absent from the pre-close snapshot.
      for (const cat of Object.keys(runningSums)) {
        openDuring[cat] ??= 0;
      }

      buckets.push({ timestamp, counts: openDuring });
    }

    return { buckets, currentOpen: parseEsqlScalar(currentOpenResponse, 'currentOpen') };
  }

  /**
   * Elasticsearch caps an ES|QL result set at `esql.query.result_truncation_max_size`
   * whatever LIMIT the query asked for, and drops the tail of the sort — here, the
   * most recent buckets. The schema's bucket ceiling should keep this unreachable,
   * so a hit means an unexpectedly wide category vocabulary.
   */
  private warnIfTruncated(response: { values: unknown[] }, label: string): void {
    if (response.values.length >= ESQL_RESULT_TRUNCATION_MAX_SIZE) {
      this.deps.logger.warn(
        `chartsSummary: the ${label} query returned ${response.values.length} rows, at or above ` +
          `the ES|QL truncation ceiling of ${ESQL_RESULT_TRUNCATION_MAX_SIZE}. The most recent ` +
          `buckets may be undercounted.`
      );
    }
  }

  /**
   * Releases the parked gate so the workflow can record the decision behind it.
   * Writes nothing but the annotations below, and only once every refusal has
   * passed — so there is nothing to roll back when a resume fails, and the
   * decision reaches the record by exactly one path regardless of which surface
   * released the gate.
   *
   * The caller is expected to have been authorized already — the routes do it
   * declaratively, and the workflow re-checks the resumer behind the gate.
   */
  async releaseGate(
    id: string,
    { approved, actionInput, dismissReason, rationale, spaceId, request }: ReleaseGateParams
  ): Promise<Proposal> {
    const { proposal, seqNo, primaryTerm } = await this.load(id, spaceId);

    // Every refusal comes first, so a rejected release leaves the record
    // exactly as it found it. Ordering matters more than it looks: an
    // annotation written ahead of a conflict would leave a dismiss reason on a
    // proposal that was never dismissed, and a later approval would land on top
    // of it.
    this.assertDecidable(proposal);

    if (approved && actionInput !== undefined && !sameInput(actionInput, proposal.actionInput)) {
      throw new ProposalConflictError(
        `Proposal [${id}] was modified since it was rendered; re-read it before approving`
      );
    }

    const annotated = await this.annotate(
      proposal,
      { dismissReason, rationale },
      { seqNo, primaryTerm }
    );

    await this.resumeGate(annotated, { spaceId, request, approved });

    return stripRanks(annotated);
  }

  /**
   * Writes the decision's free-text annotations and nothing else.
   *
   * This is the one thing a route still writes, and it exists because
   * `waitForApproval` reconstructs its resume payload as
   * `{ approved: approved === true }` and discards the rest — so a dismiss
   * reason or a rationale cannot reach the workflow through the gate. The line
   * is "the route annotates, the workflow decides". A dismissal arriving
   * through the platform's own resume API simply carries no reason, which is
   * fine because both fields are optional.
   *
   * A resume that fails after this point does leave the annotation behind on an
   * undecided proposal. That window cannot be closed without a transaction, and
   * it is the better trade: annotating after the resume would race the
   * workflow's own decision write and lose the reason outright.
   */
  private async annotate(
    proposal: StoredProposalRecord,
    { dismissReason, rationale }: Pick<ReleaseGateParams, 'dismissReason' | 'rationale'>,
    { seqNo, primaryTerm }: { seqNo?: number; primaryTerm?: number }
  ): Promise<StoredProposalRecord> {
    if (dismissReason === undefined && rationale === undefined) {
      return proposal;
    }

    const annotated: StoredProposalRecord = {
      ...proposal,
      ...(dismissReason !== undefined ? { dismissReason } : {}),
      ...(rationale !== undefined ? { rationale } : {}),
    };
    const { id, ...document } = annotated;

    await this.writeDocument(id, document, { seqNo, primaryTerm });

    return annotated;
  }

  /**
   * Called by the gate workflow to advance a proposal it owns. Two independent
   * guards, because the two axes settle independently: a status cannot leave a
   * terminal state, so a late `on-failure` handler firing after the action
   * succeeded cannot rewrite the outcome; and a decision cannot be overwritten,
   * so a second approver cannot reattribute the first one's call. Both live
   * here rather than in the workflow YAML so they hold for every caller.
   */
  async update(params: UpdateProposalParams, spaceId: string): Promise<Proposal> {
    const { id } = params;
    const { proposal, seqNo, primaryTerm } = await this.load(id, spaceId);

    // Re-writing the same terminal status is allowed, so a settled proposal
    // stays idempotent: the workflow's failure handler writes `failed` onto a
    // record the loop may have already failed, and refusing that would replace
    // the real error with a conflict about recording it.
    if (
      params.status !== undefined &&
      params.status !== proposal.status &&
      isTerminal(proposal.status)
    ) {
      throw new ProposalConflictError(
        `Proposal [${id}] already settled as ${proposal.status} and cannot be moved to ${params.status}`
      );
    }
    if (params.decision !== undefined && proposal.decision !== undefined) {
      throw new ProposalConflictError(
        `Proposal [${id}] was already decided as ${proposal.decision}`
      );
    }

    const decision = params.decision ?? proposal.decision;
    const status = params.status ?? proposal.status;
    assertValidPair(id, decision, status);

    /**
     * Stamped the moment the proposal stops awaiting, by either route: a human
     * deciding, or the workflow settling it without one. Server-derived rather
     * than a parameter, so the recorded moment is always the moment it was
     * written, and write-once so a later annotation cannot move it.
     *
     * The second half is what `chartsSummary` needs: it reads `decidedAt` as the
     * "closed" event, and a proposal the workflow terminated early — a
     * malfunction settling it `expired` while its deadline is still in the
     * future — would otherwise read as open until that deadline arrived.
     */
    const settledAt =
      proposal.decidedAt ??
      (params.decision !== undefined || isTerminal(status) ? new Date().toISOString() : undefined);

    const updated: StoredProposalRecord = {
      ...proposal,
      status,
      decision,
      ...(settledAt !== undefined ? { decidedAt: settledAt } : {}),
      ...(params.decision !== undefined
        ? { decidedBy: params.decidedBy ?? proposal.decidedBy }
        : {}),
      ...(params.dismissReason !== undefined ? { dismissReason: params.dismissReason } : {}),
      ...(params.rationale !== undefined ? { rationale: params.rationale } : {}),
      ...(params.executionError !== undefined ? { executionError: params.executionError } : {}),
    };
    const { id: _id, ...document } = updated;

    await this.writeDocument(id, document, { seqNo, primaryTerm });

    return stripRanks(updated);
  }

  /**
   * Creates a fresh proposal for the same subject and marks the original as
   * superseded by it, so a failed action can be re-offered to a human without
   * reusing a record that already settled as `failed`.
   *
   * `createdAt` and `expiresAt` are inherited rather than restarted. The
   * deadline is the analyst's, not the attempt's: letting each retry reset it
   * would make a chain of failures outlive any deadline the queue ever showed.
   * Inheriting `createdAt` keeps the chain sorting where the original sat.
   *
   * `workflowExecutionId` is the original's, because the gate execution is
   * still running and parked — approving the clone resumes that same execution.
   */
  async clone({ id, executionError }: CloneProposalParams, spaceId: string): Promise<string> {
    const { proposal, seqNo, primaryTerm } = await this.load(id, spaceId);

    // Asserted here rather than left to the caller, because this is reachable
    // as a registered step: any workflow could otherwise re-open a succeeded
    // or dismissed proposal as `pending` and hide the real one behind
    // `supersededBy`. A failed action is the only thing there is to re-offer.
    if (proposal.decision !== 'approved' || proposal.status !== 'failed') {
      throw new ProposalConflictError(
        `Proposal [${id}] cannot be cloned: only an approved proposal whose action failed can be ` +
          `re-offered, and this one is ${proposal.decision ?? 'undecided'}/${proposal.status}`
      );
    }

    if (proposal.supersededBy !== undefined) {
      // Overwriting the pointer would orphan the first clone: it would stay
      // live and undecided with nothing referring to it.
      throw new ProposalConflictError(
        `Proposal [${id}] was already superseded by ${proposal.supersededBy}`
      );
    }

    const cloneId = uuidv4();
    const { id: _id, ...original } = proposal;

    const document: ProposalDocument = {
      ...original,
      status: 'pending',
      decision: undefined,
      supersededBy: undefined,
      decidedBy: undefined,
      decidedAt: undefined,
      dismissReason: undefined,
      rationale: undefined,
      executionError: undefined,
    };

    // The clone is created before the original is marked, deliberately. The
    // two writes cannot be atomic, and if the second one loses its race the
    // queue shows both records — whereas marking first would leave a pointer
    // to a clone that does not exist, hiding the original behind
    // `excludeSuperseded` with nothing live in its place.
    await this.deps.storage.index({ id: cloneId, document, op_type: 'create' });

    // Allowed even though the original sits at a terminal status: only status
    // transitions and the decision are guarded, and neither moves here.
    const superseded: ProposalDocument = {
      ...original,
      supersededBy: cloneId,
      ...(executionError !== undefined ? { executionError } : {}),
    };

    await this.writeDocument(id, superseded, { seqNo, primaryTerm });

    return cloneId;
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
    const definition = await this.fetchActionDefinition(actionWorkflowId, spaceId);
    return definition && this.readActionMetadata(actionWorkflowId, definition);
  }

  /**
   * The creation path: one fetch, then both the metadata and the input check.
   * An invalid input throws, because a proposal whose action can never run has
   * no business sitting in a human's queue.
   */
  private async resolveAndValidateAction(
    actionWorkflowId: string,
    actionInput: Record<string, unknown> | undefined,
    spaceId: string
  ): Promise<ActionMetadata | undefined> {
    const definition = await this.fetchActionDefinition(actionWorkflowId, spaceId);
    if (!definition) {
      return undefined;
    }

    this.assertActionInputValid(actionWorkflowId, definition, actionInput);
    return this.readActionMetadata(actionWorkflowId, definition);
  }

  /**
   * Validates `actionInput` against the schema the action declares on its manual
   * trigger. Best-effort by design: the JSON Schema to zod conversion does not
   * cover every keyword, so this catches the common mistakes — a missing
   * required field or the wrong type — and lets anything it cannot express
   * through rather than rejecting a valid input.
   */
  private assertActionInputValid(
    actionWorkflowId: string,
    definition: ActionWorkflowDefinition,
    actionInput: Record<string, unknown> | undefined
  ): void {
    const inputSchema = definition.triggers?.find(({ type }) => type === 'manual')?.inputs
      ?.properties?.[ACTION_WORKFLOW_INPUT];

    if (!inputSchema) {
      // The action declares no input contract, so there is nothing to check.
      return;
    }

    const parsed = convertJsonSchemaToZod(inputSchema as JSONSchema7).safeParse(actionInput ?? {});
    if (!parsed.success) {
      throw new ProposalInvalidActionInputError(
        `actionInput does not satisfy action workflow [${actionWorkflowId}]: ${parsed.error.issues
          .map(({ path, message }) => `${path.join('.') || '(root)'}: ${message}`)
          .join('; ')}`
      );
    }
  }

  private async fetchActionDefinition(
    actionWorkflowId: string,
    spaceId: string
  ): Promise<ActionWorkflowDefinition | undefined> {
    try {
      const workflow = await this.deps.getWorkflowsApi().getWorkflow(actionWorkflowId, spaceId);
      return workflow?.definition as ActionWorkflowDefinition | undefined;
    } catch (error) {
      this.deps.logger.warn(
        `Failed to read action workflow [${actionWorkflowId}]: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return undefined;
    }
  }

  private readActionMetadata(
    actionWorkflowId: string,
    definition: ActionWorkflowDefinition
  ): ActionMetadata | undefined {
    const candidate = definition.consts?.actionMetadata;
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

  /**
   * Whether a decision can still be made. Both axes have to be checked, for
   * different reasons.
   *
   * The decision catches the window the status cannot: an approved proposal
   * stays at `pending` for as long as the gate workflow's post-gate steps take
   * to run, so a status check alone would let a second approver through.
   *
   * The status catches what the decision cannot: the workflow settles an
   * unanswered proposal as `expired` on attempt exhaustion or a failure before
   * anyone decided, which leaves no decision behind and can happen well before
   * the wall-clock deadline. The date check below would still read it as live.
   *
   * `pending` is the only status that is valid while undecided, so anything
   * else is already settled.
   */
  private assertDecidable(proposal: StoredProposalRecord): void {
    if (proposal.decision !== undefined) {
      throw new ProposalConflictError(
        `Proposal [${proposal.id}] was already decided as ${proposal.decision}`
      );
    }
    if (proposal.status !== 'pending') {
      throw new ProposalConflictError(
        `Proposal [${proposal.id}] has settled as ${proposal.status}`
      );
    }
    // Kept alongside the status check for the lag between a deadline passing
    // and the workflow settling the record, during which it still reads
    // `pending`.
    if (isExpired(proposal)) {
      throw new ProposalExpiredError(proposal.id);
    }
  }

  /** Optimistically-concurrent write, with the lost race reported as a conflict. */
  private async writeDocument(
    id: string,
    document: ProposalDocument,
    { seqNo, primaryTerm }: { seqNo?: number; primaryTerm?: number }
  ): Promise<void> {
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
        throw new ProposalConflictError(`Proposal [${id}] was modified by another actor first`);
      }
      throw error;
    }
  }

  /**
   * Releases the parked gate. The waiting step is resolved here and passed
   * explicitly: the platform's own lookup only matches `waitForInput`, and when
   * it resolves nothing it resumes without claiming the step or stamping the
   * audit envelope.
   */
  private async resumeGate(
    proposal: StoredProposalRecord,
    { spaceId, request, approved }: { spaceId: string; request: KibanaRequest; approved: boolean }
  ): Promise<void> {
    if (!proposal.workflowExecutionId) {
      // Unreachable by construction — the gate workflow's create step is the
      // only way to make a proposal, and it stamps its own execution id. Kept
      // as a refusal rather than an early return because the decision is
      // written behind the gate: returning would answer the caller with a 200
      // for a record that nothing will ever decide.
      throw new ProposalConflictError(
        `Proposal [${proposal.id}] has no gate execution, so its decision cannot be recorded`
      );
    }

    const api = this.deps.getWorkflowsApi();
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

  /**
   * Resolves action metadata for a collection of proposals with a concurrency
   * cap. Unique workflow IDs are fetched once each (deduplicated up front) and
   * results are collected into a Map before the proposals are assembled, so a
   * single failure for one workflow ID never affects proposals backed by a
   * different one.
   */
  private async withMetadataBatch(
    proposals: Proposal[],
    spaceId: string
  ): Promise<ProposalWithMetadata[]> {
    const uniqueWorkflowIds = [
      ...new Set(
        proposals.map((p) => p.actionWorkflowId).filter((id): id is string => id !== undefined)
      ),
    ];

    const metaEntries = await asyncMapWithLimit(uniqueWorkflowIds, 10, async (id) => {
      const meta = await this.resolveActionMetadata(id, spaceId);
      return [id, meta] as [string, ActionMetadata | undefined];
    });

    const metaMap = new Map<string, ActionMetadata | undefined>(metaEntries);

    return proposals.map((proposal) => ({
      ...proposal,
      action:
        proposal.actionWorkflowId !== undefined
          ? metaMap.get(proposal.actionWorkflowId)
          : undefined,
      expired: isExpired(proposal),
    }));
  }
}

export interface ReleaseGateParams {
  approved: boolean;
  /**
   * The action input the approver was shown. Rejected with a conflict when it
   * no longer matches the record, so an approval can never apply to values the
   * decider never saw.
   */
  actionInput?: Record<string, unknown>;
  /** Annotations the gate cannot carry; written only once every check passes. */
  dismissReason?: DismissReason;
  rationale?: string;
  spaceId: string;
  request: KibanaRequest;
}

export interface CloneProposalParams {
  id: string;
  /** Why the original failed, recorded alongside the supersession. */
  executionError?: string;
}

type QueryFilterList = Array<Record<string, unknown>>;

/**
 * Translates the shared filter vocabulary once, so every read applies it
 * identically. The space term is always present: no read crosses a space.
 */
const toFilterClauses = (
  filters: ProposalFilters & { category?: string },
  spaceId: string
): QueryFilterList => {
  const filter: QueryFilterList = [{ term: { spaceId } }];

  if (filters.status) {
    filter.push({ term: { status: filters.status } });
  }
  if (filters.decision) {
    filter.push({ term: { decision: filters.decision } });
  }
  if (filters.conversationId) {
    filter.push({ term: { conversationId: filters.conversationId } });
  }
  if (filters.category) {
    filter.push({ term: { category: filters.category } });
  }
  if (filters.excludeSuperseded) {
    // A superseded proposal is represented by its successor, so showing both
    // would put every retry of the same subject in the queue.
    filter.push({ bool: { must_not: { exists: { field: 'supersededBy' } } } });
  }
  if (filters.excludeExpired) {
    // A proposal with no deadline never expires, so it has to survive the
    // filter alongside those whose deadline is still ahead.
    filter.push({
      bool: {
        should: [
          { bool: { must_not: { exists: { field: 'expiresAt' } } } },
          { range: { expiresAt: { gt: 'now' } } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  return filter;
};

/**
 * Drops the storage-only sort ranks, so they never reach the API contract.
 * Destructuring is the point: adding a rank field forces this to be updated.
 */
const stripRanks = ({ impactRank, confidenceRank, ...proposal }: StoredProposalRecord): Proposal =>
  proposal;

const toProposal = (id: string, document: ProposalDocument): Proposal =>
  stripRanks({ id, ...document });

/**
 * A status that has settled. `pending` and `executing` are the only two a
 * proposal can still be moved out of.
 */
const isTerminal = (status: ProposalStatus): boolean =>
  status === 'succeeded' || status === 'failed' || status === 'expired' || status === 'no_action';

/**
 * The only legal decision/status pairs. Exhaustive on purpose: the two axes are
 * independent, but not every combination means anything, and a pair like
 * `dismissed` + `executing` would say an action is running for a proposal that
 * was declined.
 *
 * `no_action` reads as "no action was executed" under both decisions — a
 * dismissal, or an approval of a proposal that carries nothing to run.
 */
const VALID_STATUSES: Record<'undecided' | ProposalDecision, readonly ProposalStatus[]> = {
  undecided: ['pending', 'expired'],
  dismissed: ['no_action'],
  approved: ['no_action', 'executing', 'succeeded', 'failed'],
};

const assertValidPair = (
  id: string,
  decision: ProposalDecision | undefined,
  status: ProposalStatus
): void => {
  const allowed = VALID_STATUSES[decision ?? 'undecided'];
  if (!allowed.includes(status)) {
    throw new ProposalConflictError(
      `Proposal [${id}] cannot be ${
        decision ? `decided as ${decision}` : 'left undecided'
      } with status ${status}; expected one of ${allowed.join(', ')}`
    );
  }
};

/**
 * Treats an empty or whitespace-only string as absent. Liquid renders a missing
 * workflow input as `''`, which is not the same thing as a value — and `??`
 * cannot tell them apart, so every default behind one of these would be skipped.
 *
 * Generic so an enum-typed field keeps its type: trimming cannot move a value
 * off its union, since none of the members carry surrounding whitespace.
 */
const blankToUndefined = <Value extends string>(value: Value | undefined): Value | undefined => {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : (trimmed as Value);
};

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
        isHitlWaitStepType(step.stepType) &&
        step.status === ExecutionStatus.WAITING_FOR_INPUT &&
        !step.finishedAt &&
        !step.hitl?.respondedAt
    )
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]?.id;

/**
 * Deep equality rather than a serialized comparison: the submitted input is
 * parsed from the request body and the stored one from `_source`, so their key
 * order need not match even when the values do.
 */
const sameInput = (
  submitted: Record<string, unknown>,
  stored: Record<string, unknown> | undefined
): boolean => isEqual(submitted ?? {}, stored ?? {});

/**
 * Narrow on purpose. ES|QL raises `verification_exception` for every query it
 * refuses to plan — a renamed field, an unsupported function, a bad cast. Only
 * the unknown-column case means "the mapping has not caught up yet"; treating
 * the rest as no-data would turn a broken query into a silent flat line.
 */
const isEsqlUnknownColumnError = (error: unknown): boolean => {
  const body =
    (error as { meta?: { body?: { error?: { type?: string; reason?: string } } } })?.meta?.body
      ?.error ?? (error as { body?: { error?: { type?: string; reason?: string } } })?.body?.error;

  if (body?.type !== 'verification_exception') return false;

  const detail = `${body.reason ?? ''} ${(error as { message?: string })?.message ?? ''}`;
  return /unknown column/i.test(detail);
};

const isVersionConflict = (error: unknown): boolean => {
  const status = (error as { statusCode?: number; meta?: { statusCode?: number } })?.statusCode;
  const metaStatus = (error as { meta?: { statusCode?: number } })?.meta?.statusCode;
  return status === 409 || metaStatus === 409;
};

/**
 * Columns are looked up by name, not position: `drop_null_columns: true` (the
 * adapter default) shifts the offsets when a column comes back entirely null.
 */
const parseEsqlCountByCategory = (
  response: { columns: Array<{ name: string }>; values: Array<unknown[]> },
  countField: string
): Record<string, number> => {
  const colIdx = response.columns.findIndex((c) => c.name === countField);
  const catIdx = response.columns.findIndex((c) => c.name === 'category');
  if (colIdx === -1 || catIdx === -1) return {};

  const result: Record<string, number> = {};
  for (const row of response.values) {
    const category = row[catIdx] as string | null;
    const count = row[colIdx] as number | null;
    if (category) result[category] = count ?? 0;
  }
  return result;
};

/** Same by-name lookup, for a bare `STATS` returning a single unkeyed row. */
const parseEsqlScalar = (
  response: { columns: Array<{ name: string }>; values: Array<unknown[]> },
  countField: string
): number => {
  const colIdx = response.columns.findIndex((c) => c.name === countField);
  if (colIdx === -1) return 0;
  return (response.values[0]?.[colIdx] as number | null) ?? 0;
};

/** Same by-name lookup as above. Rows with a negative or non-finite `idx` are dropped. */
const parseEsqlCountByIdxAndCategory = (
  response: { columns: Array<{ name: string }>; values: Array<unknown[]> },
  countField: string
): Record<number, Record<string, number>> => {
  const idxCol = response.columns.findIndex((c) => c.name === 'idx');
  const catCol = response.columns.findIndex((c) => c.name === 'category');
  const cntCol = response.columns.findIndex((c) => c.name === countField);
  if (idxCol === -1 || catCol === -1 || cntCol === -1) return {};

  const result: Record<number, Record<string, number>> = {};
  for (const row of response.values) {
    const rawIdx = row[idxCol] as number | null;
    const category = row[catCol] as string | null;
    const count = row[cntCol] as number | null;

    if (rawIdx === null || rawIdx === undefined || !Number.isFinite(rawIdx) || !category) continue;
    const idx = Math.floor(rawIdx);
    if (idx < 0) continue;

    if (!result[idx]) result[idx] = {};
    result[idx][category] = count ?? 0;
  }
  return result;
};
