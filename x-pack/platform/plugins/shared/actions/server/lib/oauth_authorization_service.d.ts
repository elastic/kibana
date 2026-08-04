import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { ActionsClient } from '../actions_client';
/**
 * OAuth configuration for standard OAuth Authorization Code flow
 */
export interface OAuthFlowConfig {
    authTypeId: 'oauth_authorization_code';
    authorizationUrl: string;
    tokenUrl: string;
    clientId: string;
    scope?: string;
    scopeParamName?: string;
}
/**
 * OAuth configuration for EARS (Elastic Authentication Redirect Service) flow
 */
export interface EarsFlowConfig {
    authTypeId: 'ears';
    provider: string;
    scope?: string;
}
export type OAuthConfig = OAuthFlowConfig | EarsFlowConfig;
/**
 * Parameters for building an OAuth authorization URL
 */
interface BuildAuthorizationUrlParams {
    baseAuthorizationUrl: string;
    clientId: string;
    scope?: string;
    scopeParamName?: string;
    redirectUri: string;
    state: string;
    codeChallenge: string;
}
/**
 * Parameters for building an EARS authorization URL
 */
interface BuildEarsAuthorizationUrlParams {
    baseAuthorizationUrl: string;
    scope?: string;
    callbackUri: string;
    state: string;
    pkceChallenge: string;
}
interface ConstructorOptions {
    actionsClient: ActionsClient;
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
}
/**
 * Service for handling OAuth2 Authorization Code flow operations
 *
 * This service encapsulates the business logic for:
 * - Validating connectors use OAuth Authorization Code flow
 * - Retrieving OAuth configuration with decrypted secrets
 * - Building OAuth authorization URLs with PKCE parameters
 */
export declare class OAuthAuthorizationService {
    private readonly actionsClient;
    private readonly encryptedSavedObjectsClient;
    constructor({ actionsClient, encryptedSavedObjectsClient }: ConstructorOptions);
    /**
     * Validates that a connector uses OAuth Authorization Code or EARS flow
     * @throws Error if connector doesn't use a supported OAuth flow
     */
    private validateOAuthConnector;
    /**
     * Gets OAuth configuration for a connector with decrypted secrets
     * @param connectorId - The connector ID
     * @param namespace - The space ID where to look for the connector. For default space, it's undefined.
     * The namespace is the same as where the authorization was initiated from, which should be the space where the connector was created.
     * @returns OAuth configuration including authorizationUrl, clientId, and optional scope
     * @throws Error if connector is not found, not OAuth, or missing required config
     */
    getOAuthConfig(connectorId: string, namespace: string | undefined): Promise<OAuthConfig>;
    /**
     * Builds the redirect URI for OAuth callbacks
     *
     * The redirect URI is where the OAuth provider will send the user after authorization.
     * It points to the oauth_callback route in this Kibana instance.
     *
     * @param publicBaseUrl - The Kibana public base URL (`server.publicBaseUrl`)
     * @returns The complete redirect URI
     * @throws Error if Kibana public base URL is not configured
     */
    static getRedirectUri(publicBaseUrl: string | undefined): string;
    /**
     * Builds an OAuth authorization URL with PKCE parameters
     * @param params - Parameters for building the authorization URL
     * @returns The complete authorization URL as a string
     */
    buildAuthorizationUrl(params: BuildAuthorizationUrlParams): string;
    /**
     * Builds an EARS authorization URL with PKCE parameters.
     *
     * EARS uses different parameter names than standard OAuth:
     * - `callback_uri` instead of `redirect_uri`
     * - `pkce_challenge` instead of `code_challenge`
     * - `pkce_method` instead of `code_challenge_method`
     * - No `client_id` or `response_type` (EARS manages client credentials)
     */
    buildEarsAuthorizationUrl(params: BuildEarsAuthorizationUrlParams): string;
}
export {};
