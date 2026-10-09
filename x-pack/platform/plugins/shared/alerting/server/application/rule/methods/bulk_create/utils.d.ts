import type { BulkOperationError } from '../../../../rules_client/types';
import type { RuleParams } from '../../types';
import type { PreparedRule, PrepareRuleArgs } from './types';
export declare const prepareRule: <Params extends RuleParams>({ context, actionsClient, username, profileUid, id, rule, apiKeys, invalidKeys, }: PrepareRuleArgs<Params>) => Promise<{
    prepared?: PreparedRule;
    error?: BulkOperationError;
}>;
