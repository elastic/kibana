export interface AlertRulePathOverrides {
    /**
     * Additional alert field paths to consult when resolving the rule id, before
     * the default ECS path (`kibana.alert.rule.uuid`). Use this to support
     * legacy/non-ECS shapes such as `signal.rule.id` (Security signals).
     */
    extraIdPaths?: string[];
    /**
     * Additional alert field paths to consult when resolving the rule name,
     * before the default ECS path (`kibana.alert.rule.name`).
     */
    extraNamePaths?: string[];
}
/**
 * Returns the first non-empty rule id from (in order):
 * 1) the attachment's own ruleId metadata,
 * 2) any solution-specific extra alert paths,
 * 3) the ECS `kibana.alert.rule.uuid` path on the fetched alert.
 */
export declare const getRuleId: (attachmentRuleId: string | null | undefined, alertData?: unknown, options?: AlertRulePathOverrides) => string | null;
/**
 * Returns the first non-empty rule name from (in order):
 * 1) the attachment's own ruleName metadata,
 * 2) any solution-specific extra alert paths,
 * 3) the ECS `kibana.alert.rule.name` path on the fetched alert.
 */
export declare const getRuleName: (attachmentRuleName: string | null | undefined, alertData?: unknown, options?: AlertRulePathOverrides) => string | null;
export interface ResolvedRuleInfo {
    ruleId: string | null;
    ruleName: string | null;
}
export interface GetRuleInfoArgs extends AlertRulePathOverrides {
    ruleId: string | null | undefined;
    ruleName: string | null | undefined;
    alertId?: string;
    alertData?: Record<string, unknown>;
}
/**
 * Resolves the rule id and rule name to display for an alert attachment by
 * combining the attachment's own metadata with the alert document fetched at
 * render time. Returns `null` for either field when nothing can be resolved.
 */
export declare const getRuleInfo: ({ ruleId, ruleName, alertId, alertData, extraIdPaths, extraNamePaths, }: GetRuleInfoArgs) => ResolvedRuleInfo;
