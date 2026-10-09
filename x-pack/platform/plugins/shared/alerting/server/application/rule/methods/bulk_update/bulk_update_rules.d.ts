import type { RulesClientContext } from '../../../../rules_client/types';
import type { RuleParams } from '../../types';
import type { BulkUpdateRulesParams, BulkUpdateRulesResult } from './types';
export declare function bulkUpdateRules<Params extends RuleParams = never>(context: RulesClientContext, params: BulkUpdateRulesParams<Params>): Promise<BulkUpdateRulesResult>;
