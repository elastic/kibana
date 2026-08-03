import type { FindRulesInternalResponseV1 } from '../../../../../../../../common/routes/rule/apis/find/internal';
import type { FindResult } from '../../../../../../../application/rule/methods/find';
import type { RuleSnoozedInstance } from '../../../../../../../application/rule/types';
type RuleWithSnoozedInstances = FindResult<{}>['data'][number] & {
    snoozedInstances?: RuleSnoozedInstance[];
};
export declare const transformPartialRule: (rule: RuleWithSnoozedInstances, fields?: string[]) => FindRulesInternalResponseV1["data"][number];
export declare const transformFindRulesInternalResponse: (result: FindResult<{}>, fields?: string[]) => FindRulesInternalResponseV1;
export {};
