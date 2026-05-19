export interface MatcherContextRule {
    id: string;
    name: string;
    description: string;
    tags: string[];
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface MatcherContext {
    last_event_timestamp: string;
    group_hash: string;
    episode_id: string;
    episode_status: 'inactive' | 'pending' | 'active' | 'recovering';
    rule: MatcherContextRule;
    data?: Record<string, unknown>;
}
export interface MatcherContextFieldDescriptor {
    path: string;
    type: 'string' | 'boolean' | 'string[]' | 'object';
}
export declare const MATCHER_CONTEXT_FIELDS: MatcherContextFieldDescriptor[];
