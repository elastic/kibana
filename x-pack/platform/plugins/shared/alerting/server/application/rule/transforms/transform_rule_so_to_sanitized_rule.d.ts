import type { getRuleSo } from '../../../data/rule';
import type { RulesClientContext } from '../../../rules_client/types';
import type { SanitizedRule } from '../../../types';
import type { RuleParams } from '../types';
interface TransformRuleSoToSanitizedRuleOptions {
    includeLegacyId?: boolean;
    includeSnoozeData?: boolean;
    excludeFromPublicApi?: boolean;
}
type RuleSo = Awaited<ReturnType<typeof getRuleSo>>;
export declare function transformRuleSoToSanitizedRule<Params extends RuleParams = never>(context: RulesClientContext, ruleSo: RuleSo, options: TransformRuleSoToSanitizedRuleOptions): Promise<SanitizedRule<Params>>;
export {};
