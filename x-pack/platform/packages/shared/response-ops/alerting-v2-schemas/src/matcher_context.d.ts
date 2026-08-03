export interface MatcherContextRule {
    id: string;
    name: string;
    tags: string[];
}
export interface MatcherContext {
    last_event_timestamp: string;
    group_hash: string;
    episode_id: string;
    episode_status: 'inactive' | 'pending' | 'active' | 'recovering';
    severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
    rule?: MatcherContextRule;
    data?: Record<string, unknown>;
}
export interface MatcherContextFieldDescriptor {
    path: string;
    type: 'string' | 'boolean' | 'string[]' | 'object';
}
export declare const MATCHER_CONTEXT_FIELDS: MatcherContextFieldDescriptor[];
