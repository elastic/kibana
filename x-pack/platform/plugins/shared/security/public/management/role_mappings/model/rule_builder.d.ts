import type { Rule } from './rule';
import type { RoleMapping } from '../../../../common';
interface RuleBuilderResult {
    /** The maximum rule depth within the parsed rule set. */
    maxDepth: number;
    /** The parsed rule set. */
    rules: Rule | null;
}
/**
 * Given a set of raw rules, this constructs a class based tree for consumption by the Role Management UI.
 * This also performs validation on the raw rule set, as it is possible to enter raw JSON in the JSONRuleEditor,
 * so we have no guarantees that the rule set is valid ahead of time.
 *
 * @param rawRules the raw rules to translate.
 */
export declare function generateRulesFromRaw(rawRules?: RoleMapping['rules']): RuleBuilderResult;
export {};
