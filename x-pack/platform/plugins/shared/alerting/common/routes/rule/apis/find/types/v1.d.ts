import type { TypeOf } from '@kbn/config-schema';
import type { RuleParamsV1, RuleResponseV1 } from '../../../response';
import type { findRulesRequestQuerySchemaV1, findRulesInternalRequestBodySchemaV1 } from '..';
export type FindRulesRequestQuery = TypeOf<typeof findRulesRequestQuerySchemaV1>;
export type FindRulesInternalRequestBody = TypeOf<typeof findRulesInternalRequestBodySchemaV1>;
export interface FindRulesResponse<Params extends RuleParamsV1 = never> {
    body: {
        page: number;
        per_page: number;
        total: number;
        data: Array<Partial<RuleResponseV1<Params>>>;
    };
}
