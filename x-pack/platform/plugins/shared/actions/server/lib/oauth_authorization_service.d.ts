import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { ActionsClient } from '../actions_client';
/**
 * OAuth configuration required for authorization flow
 */
export interface OAuthConfig {
    authorizationUrl: string;
    clientId: string;
    scope?: string;
}
/**
 * Parameters for building an OAuth authorization URL
 */
interface BuildAuthorizationUrlParams {
    baseAuthorizationUrl: string;
    clientId: string;
    scope?: string;
    redirectUri: string;
    state: string;
    codeChallenge: string;
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
     * Validates that a connector uses OAuth Authorization Code flow
     * @throws Error if connector doesn't use oauth_authorization_code
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
}
export {};
