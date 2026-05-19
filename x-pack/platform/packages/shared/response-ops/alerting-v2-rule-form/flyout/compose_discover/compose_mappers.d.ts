import type { RuleResponse, CreateRuleData, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import type { ComposeFormValues, RuleQuery, RuleKind, RecoveryPolicyType } from './compose_form_types';
/**
 * Converts old API response fields into a `RuleQuery`.
 *
 * Uses `splitQuery()` to re-derive the base/block split from the stored
 * single query string. Lossy if the user hand-edited the split, but acceptable
 * during active dev — the new schema stores the split natively.
 */
export declare function transformQueryIn(rule: {
    kind: RuleKind;
    evaluation: {
        query: {
            base: string;
        };
    };
    recovery_policy?: {
        type: string;
        query?: {
            base?: string;
        };
    } | null;
}): RuleQuery;
interface RecoveryPolicyOut {
    type: RecoveryPolicyType;
    query?: {
        base: string;
    };
}
export interface TransformQueryOutResult {
    evaluation: {
        query: {
            base: string;
        };
    };
    recovery_policy?: RecoveryPolicyOut;
}
/**
 * Converts a `RuleQuery` back into the old API fields.
 */
export declare function transformQueryOut(query: RuleQuery, kind?: RuleKind): TransformQueryOutResult;
export declare const composeFormToCreateRequest: (formValues: ComposeFormValues) => CreateRuleData;
export declare const composeFormToUpdateRequest: (formValues: ComposeFormValues) => UpdateRuleData;
export declare const mapRuleToComposeFormValues: (rule: RuleResponse) => ComposeFormValues;
export {};
