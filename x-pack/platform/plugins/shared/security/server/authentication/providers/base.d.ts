import type { Headers, HttpServiceSetup, IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AuthenticationInfo } from '../../elasticsearch';
import type { SessionValue } from '../../session_management';
import type { UiamServicePublic } from '../../uiam';
import { AuthenticationResult } from '../authentication_result';
import type { DeauthenticationResult } from '../deauthentication_result';
import type { Tokens } from '../tokens';
/**
 * Represents available provider options.
 */
export interface AuthenticationProviderOptions {
    name: string;
    getServerBaseURL: () => string;
    basePath: HttpServiceSetup['basePath'];
    getRequestOriginalURL: (request: KibanaRequest, additionalQueryStringParameters?: Array<[string, string]>) => string;
    client: IClusterClient;
    logger: Logger;
    tokens: PublicMethodsOf<Tokens>;
    uiam?: UiamServicePublic;
    urls: {
        loggedOut: (request: KibanaRequest) => string;
    };
    isElasticCloudDeployment: () => boolean;
}
/**
 * Represents available provider specific options.
 */
export type AuthenticationProviderSpecificOptions = Record<string, unknown>;
/**
 * Name of the Elastic Cloud built-in SSO realm.
 */
export declare const ELASTIC_CLOUD_SSO_REALM_NAME = "cloud-saml-kibana";
/**
 * Base class that all authentication providers should extend.
 */
export declare abstract class BaseAuthenticationProvider<TState = unknown> {
    protected readonly options: Readonly<AuthenticationProviderOptions>;
    /**
     * Type of the provider.
     */
    static readonly type: string;
    /**
     * Type of the provider. We use `this.constructor` trick to get access to the static `type` field
     * of the specific `BaseAuthenticationProvider` subclass.
     */
    readonly type: string;
    /**
     * Logger instance bound to a specific provider context.
     */
    protected readonly logger: Logger;
    /**
     * Instantiates AuthenticationProvider.
     * @param options Provider options object.
     */
    constructor(options: Readonly<AuthenticationProviderOptions>);
    /**
     * Determines whether intermediate session should be invalidated after a successful login.
     * Some providers need to have their state checked to make sure all pending login attempts have
     * completed before invalidating the session. This is particularly important for the SAML Provider,
     * which may have pending login requests pending
     * @param [state] Optional state object associated with the provider.
     * @returns `true` if the intermediate session should be invalidated, `false` otherwise.
     */
    shouldInvalidateIntermediateSessionAfterLogin(state?: unknown): boolean;
    /**
     * Performs initial login request and creates user session. Provider isn't required to implement
     * this method if it doesn't support initial login request.
     * @param request Request instance.
     * @param loginAttempt Login attempt associated with the provider.
     * @param [session] Optional session object associated with the provider.
     */
    login(request: KibanaRequest, loginAttempt: unknown, session?: SessionValue<TState> | null): Promise<AuthenticationResult>;
    /**
     * Performs request authentication based on the session created during login or other information
     * associated with the request (e.g. `Authorization` HTTP header).
     * @param request Request instance.
     * @param [session] Optional session object associated with the provider.
     */
    abstract authenticate(request: KibanaRequest, session: SessionValue<TState> | null): Promise<AuthenticationResult>;
    /**
     * Invalidates user session associated with the request.
     * @param request Request instance.
     * @param [session] Optional session object associated with the provider.
     */
    abstract logout(request: KibanaRequest, session?: SessionValue<TState> | null): Promise<DeauthenticationResult>;
    /**
     * Returns HTTP authentication scheme that provider uses within `Authorization` HTTP header that
     * it attaches to all successfully authenticated requests to Elasticsearch or `null` in case
     * provider doesn't attach any additional `Authorization` HTTP headers.
     */
    abstract getHTTPAuthenticationScheme(): string | null;
    /**
     * Queries Elasticsearch `_authenticate` endpoint to authenticate request and retrieve the user
     * information of authenticated user.
     * @param request Request instance.
     * @param [authHeaders] Optional `Headers` dictionary to send with the request.
     * @param [session] Optional session object associated with the provider.
     */
    protected getUser(request: KibanaRequest, authHeaders?: Headers, session?: SessionValue<TState>): Promise<Readonly<{
        authentication_realm: Readonly<{
            name: string;
            type: string;
        }>;
        lookup_realm: Readonly<{
            name: string;
            type: string;
        }>;
        authentication_provider: Readonly<{
            type: string;
            name: string;
        }>;
        authentication_type: string;
        elastic_cloud_user: boolean;
        profile_uid?: string | undefined;
        operator?: boolean | undefined;
        api_key?: Readonly<{
            name: string;
            id: string;
            managed_by: import("@elastic/elasticsearch/lib/api/types").SecurityCredentialManagedBy;
        }> | undefined;
        username: string;
        email?: string | undefined;
        full_name?: string | undefined;
        roles: readonly string[];
        enabled: boolean;
        metadata?: Readonly<{
            _reserved: boolean;
            _deprecated?: boolean | undefined;
            _deprecated_reason?: string | undefined;
        }> | undefined;
    }>>;
    /**
     * Converts Elasticsearch Authentication result to a Kibana authenticated user.
     * @param authenticationInfo Result returned from the `_authenticate` operation.
     */
    protected authenticationInfoToAuthenticatedUser(authenticationInfo: AuthenticationInfo): Readonly<{
        authentication_realm: Readonly<{
            name: string;
            type: string;
        }>;
        lookup_realm: Readonly<{
            name: string;
            type: string;
        }>;
        authentication_provider: Readonly<{
            type: string;
            name: string;
        }>;
        authentication_type: string;
        elastic_cloud_user: boolean;
        profile_uid?: string | undefined;
        operator?: boolean | undefined;
        api_key?: Readonly<{
            name: string;
            id: string;
            managed_by: import("@elastic/elasticsearch/lib/api/types").SecurityCredentialManagedBy;
        }> | undefined;
        username: string;
        email?: string | undefined;
        full_name?: string | undefined;
        roles: readonly string[];
        enabled: boolean;
        metadata?: Readonly<{
            _reserved: boolean;
            _deprecated?: boolean | undefined;
            _deprecated_reason?: string | undefined;
        }> | undefined;
    }>;
    private getMinAuthenticationUserProxy;
}
