import type { AuthenticatedUser, SecurityServiceStart, IBasePath } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { TaskInstance, TaskUserScope } from '../task';
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
export declare const requestHasApiKey: (security: SecurityServiceStart, request: KibanaRequest) => boolean;
export declare const getApiKeyFromRequest: (request: KibanaRequest) => {
    id: string;
    api_key: string;
} | null;
export declare const createApiKey: (taskInstances: TaskInstance[], request: KibanaRequest, security: SecurityServiceStart) => Promise<Map<string, EncodedApiKeyResult>>;
export declare const getApiKeyAndUserScope: (taskInstances: TaskInstance[], request: KibanaRequest, security: SecurityServiceStart, basePath: IBasePath) => Promise<Map<string, ApiKeyAndUserScope>>;
