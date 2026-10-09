import type { RulesClientContext, CreateAPIKeyResult } from '../types';
export interface ResolvedAPIKey {
    createdAPIKey: CreateAPIKeyResult | null;
    isAuthTypeApiKey: boolean;
}
export interface RuleApiKeyOwnership {
    apiKeyCreatedByUser?: boolean | null;
}
export interface ResolveRuleAPIKeyOptions {
    apiKeyOwnership?: RuleApiKeyOwnership;
    cloneApiKey?: boolean;
    refresh?: boolean | 'wait_for';
}
export declare const resolveRuleAPIKey: (context: RulesClientContext, name: string, enabled: boolean, { apiKeyOwnership, cloneApiKey, refresh }?: ResolveRuleAPIKeyOptions) => Promise<ResolvedAPIKey>;
