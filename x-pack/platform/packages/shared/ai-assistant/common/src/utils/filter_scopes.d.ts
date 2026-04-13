import type { AssistantScope } from '../types';
export declare function filterScopes<T extends {
    scopes?: AssistantScope[];
}>(scopeFilters?: AssistantScope[]): (value: T) => boolean;
