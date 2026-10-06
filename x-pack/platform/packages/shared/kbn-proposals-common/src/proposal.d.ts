import type { ActionMetadata } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
/**
 * What a human concluded. Absent until someone decides, which is what makes
 * "awaiting a decision" answerable regardless of the surface that decided.
 * Immutable once set.
 */
export declare const proposalDecisionSchema: z.ZodEnum<{
    approved: "approved";
    dismissed: "dismissed";
}>;
export type ProposalDecision = z.infer<typeof proposalDecisionSchema>;
/**
 * Where the proposal got to, independent of what was decided. `no_action`
 * means a human answered and nothing will execute — a dismissal, or an
 * approval of a proposal that carries no action; without it both would sit at
 * `pending` forever, indistinguishable from awaiting. `expired` means nobody
 * answered in time, so `dismissed` no longer does double duty for "declined"
 * and "deadline passed".
 */
export declare const proposalStatusSchema: z.ZodEnum<{
    executing: "executing";
    expired: "expired";
    failed: "failed";
    no_action: "no_action";
    pending: "pending";
    succeeded: "succeeded";
    superseded: "superseded";
}>;
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;
/** Same vocabulary an action declares about itself, so the two cannot drift. */
export declare const proposalImpactSchema: z.ZodEnum<{
    critical: "critical";
    high: "high";
    low: "low";
    medium: "medium";
}>;
export type ProposalImpact = z.infer<typeof proposalImpactSchema>;
export declare const proposalConfidenceSchema: z.ZodEnum<{
    high: "high";
    low: "low";
    medium: "medium";
}>;
export type ProposalConfidence = z.infer<typeof proposalConfidenceSchema>;
/**
 * Which feature produced the proposal, so a queue can show its own and not
 * another's. Deliberately not "machine or human" — `createdBy` already records
 * the actor behind it.
 *
 * Closed, unlike `category`, because the two fail differently. A typo'd
 * category still appears, as a group with a silly name; a typo'd origin matches
 * no queue's filter and the proposal is never seen by anyone. Consumers filter
 * on exact equality, so this is a routing key every producer and consumer has
 * to agree on character for character — which is what an enum enforces and an
 * open vocabulary cannot.
 *
 * One member per producing feature. The members below that nothing writes yet
 * are declared intent: adding a producer is a deliberate change here, reviewed
 * alongside the queue-visibility consequences it carries.
 *
 * Required, and fixed for the whole revision chain: `revise()` and `clone()`
 * inherit it, and no update path can move it.
 */
export declare const proposalOriginSchema: z.ZodEnum<{
    agent_builder: "agent_builder";
    alertzero: "alertzero";
    context_engine: "context_engine";
    nightshift: "nightshift";
}>;
export type ProposalOrigin = z.infer<typeof proposalOriginSchema>;
/**
 * Grouping axis for the decision queue, resolved from the action's own metadata.
 * An arbitrary keyword: this plugin owns no vocabulary, because each solution
 * defines the categories its actions declare and its queries group by.
 */
export declare const proposalCategorySchema: z.ZodString;
export type ProposalCategory = z.infer<typeof proposalCategorySchema>;
export declare const dismissReasonSchema: z.ZodEnum<{
    duplicate: "duplicate";
    false_positive: "false_positive";
    handled_elsewhere: "handled_elsewhere";
    no_reason: "no_reason";
    other: "other";
    risk_accepted: "risk_accepted";
}>;
export type DismissReason = z.infer<typeof dismissReasonSchema>;
/** One line in a queue row, and written by a worker's LLM, so it is kept short. */
export declare const MAX_TITLE_LENGTH = 256;
/**
 * Names a proposal whose caller supplied no title and whose action declares no
 * name — including one carrying no action at all, where the comment describes
 * something the analyst performs themselves. Stamped on write rather than
 * resolved per viewer, and so deliberately untranslated: the `comment` beside
 * it is stored English too.
 */
export declare const DEFAULT_PROPOSAL_TITLE = "Proposed action";
/** Markdown shown to a human, so it needs room without being unbounded. */
export declare const MAX_COMMENT_LENGTH = 8192;
export declare const MAX_RATIONALE_LENGTH = 4096;
export declare const boundedActionInput: z.ZodRecord<z.ZodString, z.ZodUnknown>;
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
export declare const proposalUserSchema: z.ZodObject<{
    username: z.ZodNullable<z.ZodString>;
    fullName: z.ZodNullable<z.ZodString>;
    email: z.ZodNullable<z.ZodString>;
    profileUid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ProposalUser = z.infer<typeof proposalUserSchema>;
export declare const proposalSchema: z.ZodObject<{
    id: z.ZodString;
    spaceId: z.ZodString;
    conversationId: z.ZodString;
    title: z.ZodString;
    comment: z.ZodString;
    actionWorkflowId: z.ZodOptional<z.ZodString>;
    actionInput: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    status: z.ZodEnum<{
        executing: "executing";
        expired: "expired";
        failed: "failed";
        no_action: "no_action";
        pending: "pending";
        succeeded: "succeeded";
        superseded: "superseded";
    }>;
    decision: z.ZodOptional<z.ZodEnum<{
        approved: "approved";
        dismissed: "dismissed";
    }>>;
    supersededBy: z.ZodOptional<z.ZodString>;
    rootProposalId: z.ZodOptional<z.ZodString>;
    supersedes: z.ZodOptional<z.ZodString>;
    revision: z.ZodOptional<z.ZodNumber>;
    impact: z.ZodEnum<{
        critical: "critical";
        high: "high";
        low: "low";
        medium: "medium";
    }>;
    confidence: z.ZodEnum<{
        high: "high";
        low: "low";
        medium: "medium";
    }>;
    category: z.ZodOptional<z.ZodString>;
    origin: z.ZodEnum<{
        agent_builder: "agent_builder";
        alertzero: "alertzero";
        context_engine: "context_engine";
        nightshift: "nightshift";
    }>;
    expiresAt: z.ZodOptional<z.ZodString>;
    decidedBy: z.ZodOptional<z.ZodObject<{
        username: z.ZodNullable<z.ZodString>;
        fullName: z.ZodNullable<z.ZodString>;
        email: z.ZodNullable<z.ZodString>;
        profileUid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    decidedAt: z.ZodOptional<z.ZodString>;
    dismissReason: z.ZodOptional<z.ZodEnum<{
        duplicate: "duplicate";
        false_positive: "false_positive";
        handled_elsewhere: "handled_elsewhere";
        no_reason: "no_reason";
        other: "other";
        risk_accepted: "risk_accepted";
    }>>;
    rationale: z.ZodOptional<z.ZodString>;
    executionError: z.ZodOptional<z.ZodString>;
    previousExecutionError: z.ZodOptional<z.ZodString>;
    workflowExecutionId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    createdBy: z.ZodOptional<z.ZodObject<{
        username: z.ZodNullable<z.ZodString>;
        fullName: z.ZodNullable<z.ZodString>;
        email: z.ZodNullable<z.ZodString>;
        profileUid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type Proposal = z.infer<typeof proposalSchema>;
/** Catalog metadata resolved on read. */
export interface ProposalWithMetadata extends Proposal {
    action?: ActionMetadata;
}
export declare const createProposalRequestSchema: z.ZodObject<{
    conversationId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    comment: z.ZodString;
    actionWorkflowId: z.ZodOptional<z.ZodString>;
    actionInput: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    impact: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        high: "high";
        low: "low";
        medium: "medium";
    }>>;
    category: z.ZodOptional<z.ZodString>;
    confidence: z.ZodDefault<z.ZodEnum<{
        high: "high";
        low: "low";
        medium: "medium";
    }>>;
    origin: z.ZodEnum<{
        agent_builder: "agent_builder";
        alertzero: "alertzero";
        context_engine: "context_engine";
        nightshift: "nightshift";
    }>;
    expiresAt: z.ZodOptional<z.ZodString>;
    workflowExecutionId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateProposalRequest = z.infer<typeof createProposalRequestSchema>;
export declare const approveProposalRequestSchema: z.ZodObject<{
    actionInput: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    rationale: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ApproveProposalRequest = z.infer<typeof approveProposalRequestSchema>;
export declare const dismissProposalRequestSchema: z.ZodObject<{
    dismissReason: z.ZodEnum<{
        duplicate: "duplicate";
        false_positive: "false_positive";
        handled_elsewhere: "handled_elsewhere";
        no_reason: "no_reason";
        other: "other";
        risk_accepted: "risk_accepted";
    }>;
    rationale: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type DismissProposalRequest = z.infer<typeof dismissProposalRequestSchema>;
/**
 * `from + size` must stay within Elasticsearch's default result window of
 * 10,000. Deep paging past that needs `search_after`, which this list does not
 * expose yet.
 */
export declare const MAX_PROPOSALS_PAGE_SIZE = 100;
export declare const MAX_PROPOSALS_PAGE_OFFSET: number;
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
export declare const proposalFiltersSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<{
        executing: "executing";
        expired: "expired";
        failed: "failed";
        no_action: "no_action";
        pending: "pending";
        succeeded: "succeeded";
        superseded: "superseded";
    }>>;
    decision: z.ZodOptional<z.ZodEnum<{
        approved: "approved";
        dismissed: "dismissed";
    }>>;
    conversationId: z.ZodOptional<z.ZodString>;
    origin: z.ZodOptional<z.ZodEnum<{
        agent_builder: "agent_builder";
        alertzero: "alertzero";
        context_engine: "context_engine";
        nightshift: "nightshift";
    }>>;
    excludeSuperseded: z.ZodDefault<z.ZodCodec<z.ZodString, z.ZodBoolean>>;
    excludeExpired: z.ZodDefault<z.ZodCodec<z.ZodString, z.ZodBoolean>>;
}, z.core.$strip>;
export type ProposalFilters = z.infer<typeof proposalFiltersSchema>;
export declare const listProposalsQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<{
        executing: "executing";
        expired: "expired";
        failed: "failed";
        no_action: "no_action";
        pending: "pending";
        succeeded: "succeeded";
        superseded: "superseded";
    }>>;
    decision: z.ZodOptional<z.ZodEnum<{
        approved: "approved";
        dismissed: "dismissed";
    }>>;
    conversationId: z.ZodOptional<z.ZodString>;
    origin: z.ZodOptional<z.ZodEnum<{
        agent_builder: "agent_builder";
        alertzero: "alertzero";
        context_engine: "context_engine";
        nightshift: "nightshift";
    }>>;
    excludeSuperseded: z.ZodDefault<z.ZodCodec<z.ZodString, z.ZodBoolean>>;
    excludeExpired: z.ZodDefault<z.ZodCodec<z.ZodString, z.ZodBoolean>>;
    category: z.ZodOptional<z.ZodString>;
    decidedWithinHours: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    size: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    from: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type ListProposalsQuery = z.infer<typeof listProposalsQuerySchema>;
export interface ListProposalsResponse {
    proposals: ProposalWithMetadata[];
    total: number;
}
export declare const proposalChartsSummaryQuerySchema: z.ZodObject<{
    windowHours: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    bucketMinutes: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    origin: z.ZodOptional<z.ZodEnum<{
        agent_builder: "agent_builder";
        alertzero: "alertzero";
        context_engine: "context_engine";
        nightshift: "nightshift";
    }>>;
}, z.core.$strip>;
export type ProposalChartsSummaryQuery = z.infer<typeof proposalChartsSummaryQuerySchema>;
export interface ProposalChartsSummaryBucket {
    /** Unix ms, start of the bucket. */
    timestamp: number;
    /** Per category, how many proposals were open at any point during the bucket. */
    counts: Record<string, number>;
}
export interface ProposalChartsSummaryResponse {
    /** One entry per slot, zero-filled, oldest first. */
    buckets: ProposalChartsSummaryBucket[];
    /** Proposals in this space still awaiting a decision right now, across all categories. */
    currentOpen: number;
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
export declare const isAwaitingDecision: (proposal: Pick<Proposal, 'status'>) => boolean;
/**
 * Approved, but the action it triggers has not finished running yet — `executing`, or briefly
 * still `pending` while the gate workflow's post-gate write is catching up with an approve call
 * that already returned. Declining has no action to run, so a decline never reads this; it
 * settles as soon as it is decided.
 *
 * Meant for a query's own `refetchInterval`: while true, the proposal is worth re-checking on a
 * short cadence, since whatever shows it (a badge, a modal) is actively watching for the moment
 * it finishes.
 */
export declare const isProposalSettling: (proposal: Pick<Proposal, 'decision' | 'status'>) => boolean;
/** Settled by a deadline rather than a person.
 * `pending` reads as live even past `expiresAt` until the gate workflow sweeps it,
 * so this is not a substitute for comparing `expiresAt` to `now`. */
export declare const isExpired: (proposal: Pick<Proposal, 'status'>) => boolean;
