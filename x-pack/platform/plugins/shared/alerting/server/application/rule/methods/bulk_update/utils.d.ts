import type { SavedObject } from '@kbn/core/server';
import type { BulkOperationError, RulesClientContext } from '../../../../rules_client/types';
import type { RawRule } from '../../../../types';
import type { RuleParams } from '../../types';
import type { ApiKeyEntry } from '../common_utils/invalidate_keys';
import type { BulkUpdateRulesItem, Pending, PreparedUpdate } from './types';
export declare const loadRulesByIds: (context: RulesClientContext, ids: string[]) => Promise<Array<SavedObject<RawRule>>>;
export declare const prepareUpdate: <Params extends RuleParams>({ context, actionsClient, username, profileUid, item, original, allowMissingConnectorSecrets, apiKeys, invalidKeys, }: {
    context: RulesClientContext;
    actionsClient: Awaited<ReturnType<RulesClientContext['getActionsClient']>>;
    username: string | null;
    profileUid: string | null;
    item: BulkUpdateRulesItem<Params>;
    original: SavedObject<RawRule>;
    allowMissingConnectorSecrets?: boolean;
    apiKeys: Map<string, ApiKeyEntry>;
    invalidKeys: ApiKeyEntry[];
}) => Promise<{
    prepared?: PreparedUpdate;
    error?: BulkOperationError;
}>;
export declare const loadPending: <Params extends RuleParams>(context: RulesClientContext, byId: Map<string, BulkUpdateRulesItem<Params>>, ids: string[], errors: BulkOperationError[]) => Promise<Array<Pending<Params>>>;
export declare const updateTaskSchedules: (context: RulesClientContext, updated: PreparedUpdate[]) => Promise<void>;
