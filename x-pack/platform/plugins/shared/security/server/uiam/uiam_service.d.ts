import type { Logger } from '@kbn/core/server';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type { ClientAuthentication, GrantUiamAPIKeyParams } from '@kbn/security-plugin-types-server';
import type { UiamConfigType } from '../config';
/**
 * Represents the request body for granting an API key via UIAM.
 */
export interface GrantUiamApiKeyRequestBody {
    /** A descriptive name for the API key. */
    description: string;
    /** Indicates whether this is an internal API key. */
    internal: boolean;
    /** Optional expiration time for the API key (e.g., '1d', '7d'). */
    expiration?: string;
    /** Role assignments that define access and resource limits for the API key. */
    role_assignments: {
        /** Limits defining the scope of the API key. */
        limit: {
            /** Access types granted to the API key (e.g., 'application'). */
            access: string[];
            /** Resource types the API key can access (e.g., 'project'). */
            resource: string[];
        };
    };
}
/**
 * Represents the response from granting an API key via UIAM.
 */
export interface GrantUiamApiKeyResponse {
    /** The unique identifier for the API key. */
    id: string;
    /** The API key value (encoded). */
    key: string;
    /** A descriptive name/description for the API key. */
    description: string;
}
/**
 * Represents a single key entry in the convert API keys request body.
 */
export interface ConvertUiamApiKeyRequestEntry {
    type: 'elasticsearch';
    key: string;
    endpoint: string;
}
/**
 * Represents the request body for converting API keys via UIAM.
 */
export interface ConvertUiamApiKeysRequestBody {
    keys: ConvertUiamApiKeyRequestEntry[];
}
/**
 * Represents the response from converting API keys via UIAM, containing per-key results.
 */
export interface ConvertUiamApiKeysResponse {
    results: Array<{
        status: 'success';
        id: string;
        key: string;
        description: string;
        organization_id: string;
        internal: boolean;
        role_assignments: Record<string, unknown>;
        creation_date: string;
        expiration_date: string | null;
    } | {
        status: 'failed';
        code: string;
        message: string;
        resource: string | null;
        type: string;
    }>;
}
/**
 * The service that integrates with UIAM for user authentication and session management.
 */
export interface UiamServicePublic {
    /**
     * Creates a set of authentication headers used to authenticate user with UIAM service.
     * @param accessToken UIAM session access token.
     */
    getAuthenticationHeaders(accessToken: string): Record<string, string>;
    /**
     * Returns the Elasticsearch client authentication information with the shared secret value. This is to be used with
     * `client_authentication` option in Elasticsearch client.
     */
    getClientAuthentication(): ClientAuthentication;
    /**
     * Refreshes the UIAM user session and returns new access and refresh session tokens.
     * @param refreshToken UIAM session refresh token.
     */
    refreshSessionTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Invalidates the UIAM user session represented by the provided access and refresh tokens.
     * @param accessToken UIAM session access token.
     * @param refreshToken UIAM session refresh token.
     */
    invalidateSessionTokens(accessToken: string, refreshToken: string): Promise<void>;
    /**
     * Grants an API key using the UIAM service.
     * @param authorization The HTTP authorization header containing scheme and credentials.
     * @param params The parameters for creating the API key (name and optional expiration).
     * @returns A promise that resolves to an object containing the API key details.
     */
    grantApiKey(authorization: HTTPAuthorizationHeader, params: GrantUiamAPIKeyParams): Promise<GrantUiamApiKeyResponse>;
    /**
     * Revokes a UIAM API key by its ID.
     * @param apiKeyId The ID of the API key to revoke.
     * @param apiKey The API key to revoke; will be used for authentication on this request.
     */
    revokeApiKey(apiKeyId: string, apiKey: string): Promise<void>;
    /**
     * Converts Elasticsearch API keys into UIAM API keys. The Elasticsearch endpoint is injected
     * automatically from the cloud.id configuration.
     * @param keys The base64-encoded Elasticsearch API key values to convert.
     * @returns A promise that resolves to a response containing per-key success/failure results.
     */
    convertApiKeys(keys: string[]): Promise<ConvertUiamApiKeysResponse>;
}
/**
 * See {@link UiamServicePublic}.
 */
export declare class UiamService implements UiamServicePublic {
    #private;
    constructor(logger: Logger, config: UiamConfigType, elasticsearchUrl?: string);
    /**
     * See {@link UiamServicePublic.getAuthenticationHeaders}.
     */
    getAuthenticationHeaders(accessToken: string): Record<string, string>;
    /**
     * See {@link UiamServicePublic.getClientAuthentication}.
     */
    getClientAuthentication(): ClientAuthentication;
    /**
     * See {@link UiamServicePublic.refreshSessionTokens}.
     */
    refreshSessionTokens(refreshToken: string): Promise<{
        accessToken: any;
        refreshToken: any;
    }>;
    /**
     * See {@link UiamServicePublic.invalidateSessionTokens}.
     */
    invalidateSessionTokens(accessToken: string, refreshToken: string): Promise<void>;
    /**
     * See {@link UiamServicePublic.grantApiKey}.
     */
    grantApiKey(authorization: HTTPAuthorizationHeader, params: GrantUiamAPIKeyParams): Promise<any>;
    /**
     * See {@link UiamServicePublic.revokeApiKey}.
     */
    revokeApiKey(apiKeyId: string, apiKey: string): Promise<void>;
    /**
     * See {@link UiamServicePublic.convertApiKeys}.
     */
    convertApiKeys(keys: string[]): Promise<ConvertUiamApiKeysResponse>;
}
