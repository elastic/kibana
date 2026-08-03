import type { HttpStart } from '@kbn/core-http-browser';
import type { MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
interface UseMatchedActionPoliciesParams {
    http: HttpStart;
    ruleId?: string;
    name?: string;
    tags?: string[];
}
export interface UseMatchedActionPoliciesResult {
    isLoading: boolean;
    error: Error | null;
    items: MatchedActionPolicy[];
    total: number;
}
export declare const useMatchedActionPolicies: ({ http, ruleId, name, tags, }: UseMatchedActionPoliciesParams) => UseMatchedActionPoliciesResult;
export {};
