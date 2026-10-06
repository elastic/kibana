export declare const ESCALATIONS_INTERNAL_URL: "/internal/investigations/escalations";
export declare const ESCALATION_BY_ID_URL: "/internal/investigations/escalations/{id}";
/** URL for the per-escalation assignment route. */
export declare const ESCALATION_ASSIGN_URL: "/internal/investigations/escalations/{id}/assignees";
/** URL for fetching the linked investigations of a single escalation. */
export declare const ESCALATION_LINKED_INVESTIGATIONS_URL: "/internal/investigations/escalations/{id}/linked_investigations";
/** Template ids. Owned by agent_builder_platform; referenced here for guard checks. */
export declare const ESCALATION_TEMPLATE_ID: 'escalation';
export declare const INVESTIGATION_TEMPLATE_ID: 'investigation';
/** The escalation template field that holds linked investigation conversation ids. */
export declare const ESCALATION_LINKED_INVESTIGATIONS_FIELD: 'linked_investigations';
/** The escalation template field that holds the open/closed status. */
export declare const ESCALATION_STATUS_FIELD: 'status';
/** The escalation template field that holds the list of assigned user profile uids. */
export declare const ESCALATION_ASSIGNEES_FIELD: 'assignees';
/**
 * An escalation must never list more linked investigations than this. Chosen to match
 * CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES (100) so a private escalation can have one
 * collaborator per linked investigation without hitting a separate limit.
 */
export declare const MAX_ESCALATION_LINKED_INVESTIGATIONS = 100;
/**
 * Maximum number of assignees per escalation. Matches
 * CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES (100) for the same reason as the linked
 * investigations bound above.
 */
export declare const MAX_ESCALATION_ASSIGNEES = 100;
/**
 * UI capabilities. Capabilities are namespaced by feature id rather than by
 * sub-feature, so each entity scopes its own names.
 */
export declare const ESCALATIONS_UI_CAPABILITY_SHOW: 'showEscalations';
export declare const ESCALATIONS_UI_CAPABILITY_MANAGE: 'manageEscalations';
/**
 * Pagination bounds for the list endpoint.
 *
 * These mirror agent_builder's MAX_CONVERSATION_SEARCH_PER_PAGE (50) and
 * MAX_RESULT_WINDOW (10_000), which live in that plugin's own common/ and are
 * not importable cross-plugin. They are intentionally kept in sync with those
 * upstream values — update here if agent_builder changes them.
 */
export declare const MAX_ESCALATIONS_PAGE_SIZE = 50;
export declare const MAX_ESCALATIONS_RESULT_WINDOW = 10000;
export declare const ESCALATION_STATUS_URL: "/internal/investigations/escalations/{id}/status";
export declare const ESCALATION_CLOSE_PREVIEW_URL: "/internal/investigations/escalations/{id}/_close_preview";
/** URL for linking an investigation to an existing escalation (append-only). */
export declare const ESCALATION_LINK_URL: "/internal/investigations/escalations/{id}/_link";
