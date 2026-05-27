import type { InvalidateAPIKeysParams, InvalidateAPIKeyResult as SecurityPluginInvalidateAPIKeyResult } from '@kbn/security-plugin-types-server';
import type { ApiKeyInvalidationFn, UiamApiKeyInvalidationFn } from '../invalidate_api_keys_task';
export type InvalidateAPIKeyResult = {
    apiKeysEnabled: false;
} | {
    apiKeysEnabled: true;
    result: SecurityPluginInvalidateAPIKeyResult;
};
export declare function invalidateAPIKeys(params: InvalidateAPIKeysParams, invalidateApiKeyFn?: ApiKeyInvalidationFn): Promise<InvalidateAPIKeyResult>;
export declare function invalidateUiamAPIKeys(params: {
    uiamApiKey: string;
    apiKeyId: string;
}, invalidateUiamApiKeyFn?: UiamApiKeyInvalidationFn): Promise<InvalidateAPIKeyResult>;
