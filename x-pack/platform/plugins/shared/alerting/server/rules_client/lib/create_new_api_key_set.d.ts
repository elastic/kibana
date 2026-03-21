import type { RawRule } from '../../types';
import type { RulesClientContext } from '../types';
export declare function createNewAPIKeySet(context: RulesClientContext, { id, ruleName, username, shouldUpdateApiKey, errorMessage, }: {
    id: string;
    ruleName: string;
    username: string | null;
    shouldUpdateApiKey: boolean;
    errorMessage?: string;
}): Promise<Pick<RawRule, 'apiKey' | 'apiKeyOwner' | 'apiKeyCreatedByUser' | 'uiamApiKey'>>;
