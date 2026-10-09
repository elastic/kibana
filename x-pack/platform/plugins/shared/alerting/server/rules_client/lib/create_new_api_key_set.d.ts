import type { RawRule } from '../../types';
import type { RuleApiKeyOwnership } from '../common';
import type { RulesClientContext } from '../types';
export declare function createNewAPIKeySet(context: RulesClientContext, { id, ruleName, username, profileUid, shouldUpdateApiKey, errorMessage, apiKeyOwnership, refresh, }: {
    id: string;
    ruleName: string;
    username: string | null;
    profileUid: string | null;
    shouldUpdateApiKey: boolean;
    errorMessage?: string;
    apiKeyOwnership?: RuleApiKeyOwnership;
    refresh?: boolean | 'wait_for';
}): Promise<Pick<RawRule, 'apiKey' | 'apiKeyOwner' | 'apiKeyOwnerProfileUid' | 'apiKeyCreatedByUser' | 'uiamApiKey' | 'uiamApiKeyExternal'>>;
