import type { RouteDefinitionParams } from '..';
/**
 * Response of Kibana Has API keys endpoint.
 */
export interface HasAPIKeysResult {
    hasApiKeys: boolean;
}
export declare function defineHasApiKeysRoutes({ router, getAuthenticationService, }: RouteDefinitionParams): void;
