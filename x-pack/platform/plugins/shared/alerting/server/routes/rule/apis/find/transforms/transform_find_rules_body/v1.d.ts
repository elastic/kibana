import type { FindRulesInternalRequestBodyV1, FindRulesRequestQueryV1 } from '../../../../../../../common/routes/rule/apis/find';
import type { FindRulesOptions } from '../../../../../../application/rule/methods/find';
export declare const transformFindRulesBody: (params: FindRulesRequestQueryV1) => FindRulesOptions;
export declare const transformFindRulesInternalBody: (params: FindRulesInternalRequestBodyV1) => FindRulesOptions;
