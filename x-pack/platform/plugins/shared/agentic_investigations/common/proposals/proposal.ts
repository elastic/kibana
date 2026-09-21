/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionMetadata } from '@kbn/workflows';
import { actionCategorySchema, actionImpactSchema } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { MAX_CHARTS_SUMMARY_BUCKETS } from './constants';

/**
 * What a human concluded. Absent until someone decides, which is what makes
 * "awaiting a decision" answerable regardless of the surface that decided.
 * Immutable once set.
 */
export const proposalDecisionSchema = z.enum(['approved', 'dismissed']);
export type ProposalDecision = z.infer<typeof proposalDecisionSchema>;

/**
 * Where the proposal got to, independent of what was decided. `no_action`
 * means a human answered and nothing will execute — a dismissal, or an
 * approval of a proposal that carries no action; without it both would sit at
 * `pending` forever, indistinguishable from awaiting. `expired` means nobody
 * answered in time, so `dismissed` no longer does double duty for "declined"
 * and "deadline passed".
 */
export const proposalStatusSchema = z.enum([
  'pending',
  'executing',
  'succeeded',
  'failed',
  'expired',
  'no_action',
  /** Replaced by a revision, not rejected — distinct from `dismissed`/`no_action`. */
  'superseded',
]);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

/** Same vocabulary an action declares about itself, so the two cannot drift. */
export const proposalImpactSchema = actionImpactSchema;
export type ProposalImpact = z.infer<typeof proposalImpactSchema>;

export const proposalConfidenceSchema = z.enum(['low', 'medium', 'high']);
export type ProposalConfidence = z.infer<typeof proposalConfidenceSchema>;

export const proposalOriginSchema = z.enum(['worker', 'analyst']);
export type ProposalOrigin = z.infer<typeof proposalOriginSchema>;

/**
 * Grouping axis for the decision queue, resolved from the action's own metadata.
 * An arbitrary keyword: this plugin owns no vocabulary, because each solution
 * defines the categories its actions declare and its queries group by.
 */
export const proposalCategorySchema = actionCategorySchema;
export type ProposalCategory = z.infer<typeof proposalCategorySchema>;

export const dismissReasonSchema = z.enum([
  'wrong',
  'duplicate',
  'insufficient_evidence',
  'low_value',
  'out_of_scope',
  'already_handled',
  'other',
]);
export type DismissReason = z.infer<typeof dismissReasonSchema>;

/**
 * Every string and collection reaching the HTTP layer is bounded, so an
 * unbounded body cannot be used to exhaust memory or the index.
 */
const MAX_ID_LENGTH = 256;
const MAX_NAME_LENGTH = 256;
/** Markdown shown to a human, so it needs room without being unbounded. */
export const MAX_COMMENT_LENGTH = 8192;
const MAX_RATIONALE_LENGTH = 4096;
const MAX_ERROR_LENGTH = 4096;
/** ISO 8601 timestamps; generous enough for any offset notation. */
const MAX_TIMESTAMP_LENGTH = 64;
/** An action's input is opaque to us, so cap its breadth rather than its shape. */
const MAX_ACTION_INPUT_KEYS = 100;

export const boundedActionInput = z
  .record(z.string().max(MAX_NAME_LENGTH), z.unknown())
  .refine((value) => Object.keys(value).length <= MAX_ACTION_INPUT_KEYS, {
    message: `actionInput may not exceed ${MAX_ACTION_INPUT_KEYS} keys`,
  });

/**
 * Who did something, in the shape Cases established. The profile uid is the
 * stable identity and the one a UI resolves an avatar from, but it is optional
 * because it is genuinely often absent: security disabled, a `run-as` proxy, a
 * session with no profile, or an API key whose creator has no activated
 * profile. The name fields are therefore kept as a durable fallback rather than
 * something to look up, so attribution survives a missing profile.
 *
 * Field names are camelCase to match the rest of this plugin's contract; Cases
 * uses snake_case because that is its own API convention.
 */
export const proposalUserSchema = z.object({
  username: z.string().max(MAX_ID_LENGTH).nullable(),
  fullName: z.string().max(MAX_NAME_LENGTH).nullable(),
  email: z.string().max(MAX_NAME_LENGTH).nullable(),
  profileUid: z.string().max(MAX_ID_LENGTH).optional(),
});
export type ProposalUser = z.infer<typeof proposalUserSchema>;

export const proposalSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  spaceId: z.string().max(MAX_ID_LENGTH),
  /** Conversation this proposal belongs to. The reverse link lives on the conversation. */
  conversationId: z.string().max(MAX_ID_LENGTH),
  /** Markdown explaining what is being proposed. Every proposal carries one. */
  comment: z.string().max(MAX_COMMENT_LENGTH),

  /**
   * Managed action workflow this proposal would execute. Absent for
   * non-action proposals. Immutable: a different action is a different
   * proposal.
   */
  actionWorkflowId: z.string().max(MAX_ID_LENGTH).optional(),
  /** Inputs for the action workflow. Frozen once the proposal is decided. */
  actionInput: boundedActionInput.optional(),

  status: proposalStatusSchema,
  /** Absent while the proposal is still awaiting a human. */
  decision: proposalDecisionSchema.optional(),
  /**
   * Set when this proposal was replaced — by a retry after a failed action, or
   * by an analyst-requested revision. Points at the successor so the queue can
   * show one live proposal per subject rather than every attempt.
   */
  supersededBy: z.string().max(MAX_ID_LENGTH).optional(),
  /** First proposal in the chain; equal to `id` on the root and never rewritten. */
  rootProposalId: z.string().max(MAX_ID_LENGTH).optional(),
  /** Exactly one hop back, where `rootProposalId` is the first hop. Absent on the root. */
  supersedes: z.string().max(MAX_ID_LENGTH).optional(),
  /** 1-based position in the chain. Not incremented by `clone()`: a retry is not a revision. */
  revision: z.number().int().min(1).optional(),
  /** Snapshotted from the triggering context at creation; never re-scored. */
  impact: proposalImpactSchema,
  confidence: proposalConfidenceSchema,
  /**
   * Resolved from the action workflow's metadata at creation, so it is absent
   * on a proposal that carries no action.
   */
  category: proposalCategorySchema.optional(),
  origin: proposalOriginSchema,
  /** Decision deadline, evaluated on read rather than swept into a status. */
  expiresAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),

  decidedBy: proposalUserSchema.optional(),
  decidedAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
  dismissReason: dismissReasonSchema.optional(),
  rationale: z.string().max(MAX_RATIONALE_LENGTH).optional(),
  executionError: z.string().max(MAX_ERROR_LENGTH).optional(),

  /** Gating execution to resume. Absent when no workflow is waiting. */
  workflowExecutionId: z.string().max(MAX_ID_LENGTH).optional(),

  createdAt: z.string().max(MAX_TIMESTAMP_LENGTH),
  createdBy: proposalUserSchema.optional(),
});
export type Proposal = z.infer<typeof proposalSchema>;

/** Catalog metadata resolved on read, plus the expiry evaluated at request time. */
export interface ProposalWithMetadata extends Proposal {
  action?: ActionMetadata;
  expired: boolean;
}

export const createProposalRequestSchema = z.object({
  conversationId: z.string().max(MAX_ID_LENGTH),
  comment: z.string().max(MAX_COMMENT_LENGTH),
  actionWorkflowId: z.string().max(MAX_ID_LENGTH).optional(),
  actionInput: boundedActionInput.optional(),
  /**
   * Optional rather than defaulted so "the caller omitted it" stays
   * distinguishable from "the caller said low": a supplied impact takes
   * precedence over the action's own, and only a genuine omission falls back.
   */
  impact: proposalImpactSchema.optional(),
  /**
   * Overrides the action's own declared category, and is the only way a
   * proposal carrying no action gets one at all — consumers group the queue by
   * category, so without it a non-action proposal has nowhere to appear.
   */
  category: proposalCategorySchema.optional(),
  confidence: proposalConfidenceSchema.default('medium'),
  origin: proposalOriginSchema.default('worker'),
  expiresAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
  workflowExecutionId: z.string().max(MAX_ID_LENGTH).optional(),
});
export type CreateProposalRequest = z.infer<typeof createProposalRequestSchema>;

export const approveProposalRequestSchema = z.object({
  /**
   * The action input the approver was shown. Rejected with a conflict when it
   * no longer matches the record, so an approval can never apply to values the
   * decider never saw.
   */
  actionInput: boundedActionInput.optional(),
  rationale: z.string().max(MAX_RATIONALE_LENGTH).optional(),
});
export type ApproveProposalRequest = z.infer<typeof approveProposalRequestSchema>;

export const dismissProposalRequestSchema = z.object({
  dismissReason: dismissReasonSchema,
  rationale: z.string().max(MAX_RATIONALE_LENGTH).optional(),
});
export type DismissProposalRequest = z.infer<typeof dismissProposalRequestSchema>;

/**
 * `from + size` must stay within Elasticsearch's default result window of
 * 10,000. Deep paging past that needs `search_after`, which this list does not
 * expose yet.
 */
export const MAX_PROPOSALS_PAGE_SIZE = 100;
export const MAX_PROPOSALS_PAGE_OFFSET = 10_000 - MAX_PROPOSALS_PAGE_SIZE;

/**
 * The filter vocabulary every read shares, applied as a conjunction. Both list
 * shapes understand all of it identically; they differ only in how they page
 * and in whether they union a second set on top.
 *
 * "Awaiting a human" is `status: 'pending'` and needs no filter of its own:
 * `pending` is only ever valid while undecided, so the status already says it.
 * The complementary query — "no human ever answered", which also takes in
 * `expired` — is not expressible here, because nothing needs it yet.
 */
export const proposalFiltersSchema = z.object({
  status: proposalStatusSchema.optional(),
  decision: proposalDecisionSchema.optional(),
  conversationId: z.string().max(MAX_ID_LENGTH).optional(),
  /** Drops proposals that were replaced, so a chain shows only its live head. */
  excludeSuperseded: z.stringbool().default(false),
  /**
   * Drops proposals whose deadline has passed, by date rather than by status.
   * Distinct from `status: 'expired'`: between the deadline passing and the
   * gate workflow settling the record there is task lag during which it still
   * reads `pending`, and a queue wants it gone for that whole interval. Off by
   * default so the list stays a faithful view of the index.
   */
  excludeExpired: z.stringbool().default(false),
});
export type ProposalFilters = z.infer<typeof proposalFiltersSchema>;

export const listProposalsQuerySchema = proposalFiltersSchema.extend({
  size: z.coerce.number().int().min(1).max(MAX_PROPOSALS_PAGE_SIZE).default(50),
  from: z.coerce.number().int().min(0).max(MAX_PROPOSALS_PAGE_OFFSET).default(0),
});
export type ListProposalsQuery = z.infer<typeof listProposalsQuerySchema>;

export interface ListProposalsResponse {
  proposals: ProposalWithMetadata[];
  total: number;
}

export const MAX_PROPOSALS_SIZE = 500;

export const proposalsQuerySchema = z.object({
  windowHours: z.coerce.number().int().min(1).max(168).default(24),
});
export type ProposalsQuery = z.infer<typeof proposalsQuerySchema>;

export interface ProposalsListResponse {
  proposals: ProposalWithMetadata[];
  total: number;
  truncated: boolean;
}

/**
 * Parameters for `listByWindow`: the shared filters, plus how far back to reach
 * for decisions. The union of "awaiting" and "recently decided" is what the
 * shape *is*, so it is not a flag.
 */
export interface ListByWindowQuery extends ProposalFilters {
  decidedWithinHours: number;
}

export const proposalChartsSummaryQuerySchema = z
  .object({
    /** The 168h ceiling keeps the ES|QL queries cheap. */
    windowHours: z.coerce.number().int().min(1).max(168).default(24),
    /** The 5 minute floor bounds the response size. */
    bucketMinutes: z.coerce.number().int().min(5).max(1440).default(30),
  })
  /**
   * The two bounds are independently valid but not jointly: 168h at 5-minute
   * granularity is ~2 000 buckets, and one row per (bucket, category) crosses
   * the ES|QL result ceiling. Rejecting is the honest answer — a truncated
   * result silently drops the newest buckets rather than erroring.
   */
  .refine(
    ({ windowHours, bucketMinutes }) =>
      Math.ceil((windowHours * 60) / bucketMinutes) <= MAX_CHARTS_SUMMARY_BUCKETS,
    {
      message:
        `windowHours and bucketMinutes must not resolve to more than ` +
        `${MAX_CHARTS_SUMMARY_BUCKETS} buckets`,
    }
  );
export type ProposalChartsSummaryQuery = z.infer<typeof proposalChartsSummaryQuerySchema>;

export interface ProposalChartsSummaryBucket {
  /** Unix ms, start of the bucket. */
  timestamp: number;
  /** Per category, how many proposals were created but not yet decided at the bucket end. */
  counts: Record<string, number>;
}

export interface ProposalChartsSummaryResponse {
  /** One entry per slot, zero-filled, oldest first. */
  buckets: ProposalChartsSummaryBucket[];
}

/**
 * Whether a human can still act on this proposal.
 *
 * Reads the status, not the decision: `pending` is the only status valid while
 * undecided *and* unsettled, so it is the whole condition. The decision is the
 * wrong axis here because an `expired` proposal has none either — it was
 * settled by a deadline rather than a person — and treating that as "still
 * open" puts a decision nobody can make back in the queue.
 */
export const isAwaitingDecision = (proposal: Pick<Proposal, 'status'>): boolean =>
  proposal.status === 'pending';

export const isExpired = (proposal: Pick<Proposal, 'expiresAt'>, now = Date.now()): boolean => {
  if (!proposal.expiresAt) {
    return false;
  }
  const deadline = Date.parse(proposal.expiresAt);
  return Number.isFinite(deadline) && deadline <= now;
};
