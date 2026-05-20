import type { FindRulesResponseV1 } from '../../../../../../../common/routes/rule/apis/find';
import type { RuleResponseV1, RuleParamsV1 } from '../../../../../../../common/routes/rule/response';
import type { FindResult } from '../../../../../../application/rule/methods/find';
import type { Rule, RuleParams } from '../../../../../../application/rule/types';
export declare const transformPartialRule: <Params extends RuleParams = never>(rule: Partial<Rule<Params>>, fields?: string[], includeArtifacts?: boolean) => Partial<RuleResponseV1<RuleParamsV1>>;
export declare const transformFindRulesResponse: <Params extends RuleParams = never>(result: FindResult<Params>, fields?: string[], includeArtifacts?: boolean) => FindRulesResponseV1<RuleParamsV1>["body"];
