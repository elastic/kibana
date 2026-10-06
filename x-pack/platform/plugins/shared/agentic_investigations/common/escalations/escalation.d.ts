import type { Conversation, ConversationWithoutRoundsWithPermissions } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod/v4';
/**
 * An escalation is a templated conversation of the `escalation` type
 */
export type EscalationConversation = Conversation;
export declare const escalationVisibilitySchema: z.ZodEnum<{
    private: "private";
    public: "public";
}>;
export type EscalationVisibility = z.infer<typeof escalationVisibilitySchema>;
/**
 * The open/closed status of an escalation. Values must stay in sync with the `status`
 * field options in the escalation conversation template
 * (`agent_builder_platform/server/conversation_templates/escalation.ts`).
 */
export declare const escalationStatusSchema: z.ZodEnum<{
    closed: "closed";
    open: "open";
}>;
export type EscalationStatus = z.infer<typeof escalationStatusSchema>;
export declare const createEscalationRequestSchema: z.ZodObject<{
    linked_investigation_id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    visibility: z.ZodEnum<{
        private: "private";
        public: "public";
    }>;
    assignees: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type CreateEscalationRequest = z.infer<typeof createEscalationRequestSchema>;
/**
 * Request body for the `POST /{id}/_link` endpoint.
 * Append-only — this endpoint cannot unlink investigations.
 * MVP caveat: the union is computed outside the OCC write callback, so two concurrent
 * requests could each read the same stale list and one link could be silently lost.
 * Follow-up: elastic/security-team#19370 (race-safe append).
 */
export declare const linkEscalationRequestSchema: z.ZodObject<{
    linked_investigations: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type LinkEscalationRequest = z.infer<typeof linkEscalationRequestSchema>;
/**
 * Query parameters for the list escalations endpoint.
 *
 * Uses `z.coerce.number()` because query-string values arrive as strings.
 * The `page * per_page` refinement mirrors agent_builder's `_search` route guard:
 * results beyond MAX_ESCALATIONS_RESULT_WINDOW are unreachable through offset
 * pagination, so requesting them is always an error rather than an empty page.
 *
 * `status` defaults to `'open'` to preserve backward compatibility for callers
 * that do not send the parameter. `'all'` is provided for admin / diagnostic use.
 */
export declare const listEscalationsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    per_page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    status: z.ZodDefault<z.ZodEnum<{
        all: "all";
        closed: "closed";
        open: "open";
    }>>;
    search: z.ZodOptional<z.ZodString>;
    linked_investigation_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListEscalationsQuery = z.infer<typeof listEscalationsQuerySchema>;
/**
 * An escalation as returned by the **list** endpoint.
 */
export type EscalationConversationSummary = ConversationWithoutRoundsWithPermissions & {
    /**
     * Union of the entity ids from the Impact of the linked investigations. Absent when none of
     * them has an Impact document or the impact could not be read.
     */
    entity_ids?: string[];
};
export interface ListEscalationsResponse {
    pagination: {
        total: number;
        page: number;
        per_page: number;
    };
    results: EscalationConversationSummary[];
}
/**
 * A brief summary of an investigation linked to an escalation, as returned by the
 * `GET /escalations/{id}/linked_investigations` route.
 *
 * `status` follows the same "missing or non-closed ⇒ open" rule as the escalations list filter.
 */
export interface LinkedInvestigationSummary {
    /** Investigation conversation id. */
    id: string;
    title: string;
    /** Open/closed status derived from `metadata.status`. */
    status: 'open' | 'closed';
    /** Agent Builder agent id, used for deep-linking to the conversation. */
    agent_id: string;
}
export interface ListLinkedInvestigationsResponse {
    results: LinkedInvestigationSummary[];
}
