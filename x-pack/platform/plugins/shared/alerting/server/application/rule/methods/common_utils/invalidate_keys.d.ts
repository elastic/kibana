import type { RulesClientContext } from '../../../../rules_client/types';
export interface ApiKeyEntry {
    apiKey: string | null;
    uiamApiKey: string | null;
    apiKeyCreatedByUser: boolean | null;
}
export declare const invalidateKeys: (entries: Iterable<ApiKeyEntry>, context: RulesClientContext) => Promise<void>;
