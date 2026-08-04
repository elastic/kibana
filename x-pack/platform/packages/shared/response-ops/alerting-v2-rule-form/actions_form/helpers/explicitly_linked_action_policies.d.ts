import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
/**
 * Returns true when the matcher contains a positive `rule.id` clause equal to `ruleId`.
 */
export declare const isExplicitlyLinkedToRule: (matcher: string | null | undefined, ruleId: string) => boolean;
/**
 * True when the matcher is explicitly linked to the rule and contains no filters beyond `rule.id`.
 */
export declare const isRuleScopedCatchAllMatcher: (matcher: string | null | undefined, ruleId: string) => boolean;
export interface LinkedActionPolicySummary {
    policies: ActionPolicyResponse[];
    totalCount: number;
    catchAllCount: number;
    matchingCriteriaCount: number;
}
/**
 * Filters policies explicitly linked to `ruleId` and computes stat breakdowns for the rule details UI.
 */
export declare const summarizeExplicitlyLinkedActionPolicies: (policies: ActionPolicyResponse[], ruleId: string) => LinkedActionPolicySummary;
