import type { AuthenticatedUser, SecurityServiceStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { TaskInstance, TaskUserScope } from '../task';
import type { GrantApiKeysOpts } from '../api_key_strategy/api_key_strategy';
export interface APIKeyResult {
    id: string;
    api_key: string;
}
export interface EncodedApiKeyResult {
    apiKey: string;
    apiKeyId: string;
}
export interface ApiKeyAndUserScope {
    apiKey: string;
    userScope: TaskUserScope;
}
export declare const isRequestApiKeyType: (user: AuthenticatedUser | null) => boolean;
export declare const hasApiKey: (user: AuthenticatedUser | null, request: KibanaRequest) => boolean;
export declare const requestHasApiKey: (security: SecurityServiceStart, request: KibanaRequest) => boolean;
export declare const getApiKeyFromRequest: (request: KibanaRequest) => {
    id: string;
    api_key: string;
} | null;
export declare const shouldCloneApiKeyFromRequest: (security: SecurityServiceStart, request: KibanaRequest, options?: GrantApiKeysOpts, user?: AuthenticatedUser | null) => boolean;
export declare const createApiKey: (taskInstances: TaskInstance[], request: KibanaRequest, security: SecurityServiceStart, options?: GrantApiKeysOpts, preResolved?: {
    user: AuthenticatedUser | null;
    apiKeyCreatedByUser: boolean;
}) => Promise<Map<string, EncodedApiKeyResult>>;
export declare const getApiKeyAndUserScope: (taskInstances: TaskInstance[], request: KibanaRequest, security: SecurityServiceStart, options?: GrantApiKeysOpts) => Promise<Map<string, ApiKeyAndUserScope>>;
