import type { BulkEnableRulesResponseV1 } from '../../../../../../../common/routes/rule/apis/bulk_enable';
import type { RuleParamsV1 } from '../../../../../../../common/routes/rule/response';
import type { BulkEnableRulesResult } from '../../../../../../application/rule/methods/bulk_enable/types';
import type { RuleParams } from '../../../../../../application/rule/types';
export declare const transformBulkEnableResponse: <Params extends RuleParams = never>(response: BulkEnableRulesResult<Params>) => BulkEnableRulesResponseV1<RuleParamsV1>["body"];
