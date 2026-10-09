import type { AlertEpisodeStatus } from './alert_action_schema';
import type { AlertEventSeverity } from './severity';
export interface MatcherContext {
    last_event_timestamp: string;
    group_hash: string;
    alert_id: string;
    alert_status: AlertEpisodeStatus;
    severity?: AlertEventSeverity;
    data?: Record<string, unknown>;
}
export interface MatcherContextFieldDescriptor {
    path: string;
    type: 'string' | 'boolean' | 'string[]' | 'object';
    /** Agent/UI-facing description of the matcher context field. */
    description: string;
}
/**
 * Canonical list of KQL matcher context fields. Source of truth for autocomplete
 * and for Agent Builder skill docs (`generateMatcherContextDoc`).
 */
export declare const MATCHER_CONTEXT_FIELDS: MatcherContextFieldDescriptor[];
