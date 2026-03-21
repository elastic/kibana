import type { SanitizedRule } from '../../../../types';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { FindRulesParams } from './types';
import type { RuleParams } from '../../types';
export interface FindResult<Params extends RuleParams> {
    page: number;
    perPage: number;
    total: number;
    data: Array<SanitizedRule<Params>>;
}
export declare function findRules<Params extends RuleParams = never>(context: RulesClientContext, params?: FindRulesParams): Promise<FindResult<Params>>;
