import type { RuleDomain, Rule, RuleParams } from '../types';
interface TransformRuleDomainToRuleOptions {
    isPublic?: boolean;
    includeLegacyId?: boolean;
}
export declare const transformRuleDomainToRule: <Params extends RuleParams = never>(ruleDomain: RuleDomain<Params>, options?: TransformRuleDomainToRuleOptions) => Rule<Params>;
export {};
