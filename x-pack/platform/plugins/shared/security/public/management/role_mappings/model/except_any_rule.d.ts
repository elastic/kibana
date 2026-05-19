import type { Rule } from './rule';
import { RuleGroup } from './rule_group';
/**
 * Represents a group of rules in which none can evaluate to true (all must evaluate to false).
 */
export declare class ExceptAnyRule extends RuleGroup {
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
    clone(): ExceptAnyRule;
    /** {@see RuleGroup.toRaw} */
    toRaw(): {
        except: {
            any: Record<string, any>[];
        };
    };
}
