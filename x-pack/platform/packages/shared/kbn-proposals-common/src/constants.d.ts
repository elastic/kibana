/**
 * The `.kibana-` prefix is deliberate and permanent: `.kibana*` is already
 * granted to the `kibana_system` role, so this index needs no Elasticsearch-side
 * system index registration. `anonymization` ships
 * `.kibana-anonymization-profiles` on the same reasoning.
 */
export declare const PROPOSALS_INDEX_NAME: '.kibana-proposals';
/** Shared by every route, so a caller versions the whole surface at once. */
export declare const PROPOSALS_API_VERSION: '1';
/** Agent Builder tool that appends a revision to a proposal chain. */
export declare const PROPOSALS_REVISE_TOOL_ID: 'platform.proposals.revise';
export declare const PROPOSALS_INTERNAL_URL: '/internal/proposals';
export declare const PROPOSAL_BY_ID_URL: "/internal/proposals/{id}";
export declare const PROPOSAL_APPROVE_URL: "/internal/proposals/{id}/approve";
export declare const PROPOSAL_DISMISS_URL: "/internal/proposals/{id}/dismiss";
export declare const PROPOSAL_REVISIONS_URL: "/internal/proposals/{proposalId}/revisions";
export declare const PROPOSAL_CHARTS_SUMMARY_URL: "/internal/proposals/charts-summary";
/** Agent Builder builtin tool through which an agent proposes an action in its conversation. */
export declare const PROPOSALS_CREATE_TOOL_ID: 'proposals.create';
/**
 * Stand-in category for a proposal that carries no action and therefore has no
 * category of its own. Substituted on the read path rather than at write time:
 * the category vocabulary belongs to the solution that authored the action, so
 * the stored document keeps `category` absent. Without this, action-less
 * proposals fall out of every `BY category` aggregation and are invisible to
 * both the charts and the header count that reads from them.
 */
export declare const PROPOSAL_UNCATEGORIZED: 'uncategorized';
/**
 * Ceiling on `windowHours * 60 / bucketMinutes`.
 *
 * Elasticsearch caps any ES|QL result set at `esql.query.result_truncation_max_size`
 * (10 000 by default) regardless of the LIMIT the query asks for — a user-supplied
 * limit is capped to the max rather than honoured. The per-bucket queries emit one
 * row per (bucket, category) and sort by bucket ascending, so a truncated result
 * loses the *most recent* buckets silently. Capping bucket count here keeps the
 * row count under that ceiling for any realistic number of categories.
 */
export declare const MAX_CHARTS_SUMMARY_BUCKETS = 1000;
/**
 * UI capabilities. Capabilities are namespaced by feature id rather than by
 * sub-feature, so each entity scopes its own names.
 */
export declare const PROPOSALS_UI_CAPABILITY_SHOW: 'showProposals';
export declare const PROPOSALS_UI_CAPABILITY_DECIDE: 'decideProposals';
/** Channel recorded on the workflow resume, for audit. */
export declare const PROPOSALS_RESUME_CHANNEL: 'proposals_api';
/**
 * How aggressively a query should re-check a proposal `isProposalSettling` still reads true for
 * — an approved proposal whose action has not finished running yet. Shared so every list/detail
 * query settles on the same cadence, rather than each hook inventing its own.
 */
export declare const PROPOSAL_SETTLING_POLL_INTERVAL_MS = 3000;
