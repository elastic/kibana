import type { Logger, SavedObjectReference } from '@kbn/core/server';
import type { Rule, RawRule, RuleTypeParams, RuleWithLegacyId, RuleTypeRegistry } from '../../types';
export interface GetAlertFromRawParams {
    id: string;
    ruleTypeId: string;
    rawRule: RawRule;
    references: SavedObjectReference[] | undefined;
    includeLegacyId?: boolean;
    excludeFromPublicApi?: boolean;
    includeSnoozeData?: boolean;
    omitGeneratedValues?: boolean;
}
interface GetAlertFromRawOpts {
    excludeFromPublicApi?: boolean;
    id: string;
    includeLegacyId?: boolean;
    includeSnoozeData?: boolean;
    isSystemAction: (actionId: string) => boolean;
    logger: Logger;
    omitGeneratedValues?: boolean;
    rawRule: RawRule;
    references: SavedObjectReference[] | undefined;
    ruleTypeId: string;
    ruleTypeRegistry: RuleTypeRegistry;
}
/**
 * @deprecated in favor of transformRuleAttributesToRuleDomain
 */
export declare function getAlertFromRaw<Params extends RuleTypeParams>(opts: GetAlertFromRawOpts): Rule | RuleWithLegacyId;
export {};
