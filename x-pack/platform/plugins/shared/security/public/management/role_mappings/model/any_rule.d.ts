import type { Rule } from './rule';
import { RuleGroup } from './rule_group';
/**
 * Represents a group of rules in which at least one must evaluate to true.
 */
export declare class AnyRule extends RuleGroup {
    private rules;
    constructor(rules?: Rule[]);
    /** {@see RuleGroup.getRules} */
    getRules(): Rule[];
    /** {@see RuleGroup.getDisplayTitle} */
    getDisplayTitle(): string;
    /** {@see RuleGroup.replaceRule} */
    replaceRule(ruleIndex: number, rule: Rule): void;
    /** {@see RuleGroup.removeRule} */
    removeRule(ruleIndex: number): void;
    /** {@see RuleGroup.addRule} */
    addRule(rule: Rule): void;
    /** {@see RuleGroup.canContainRules} */
    canContainRules(rules: Rule[]): boolean;
    /** {@see RuleGroup.clone} */
    clone(): AnyRule;
    /** {@see RuleGroup.toRaw} */
    toRaw(): {
        any: Record<string, any>[];
    };
}
