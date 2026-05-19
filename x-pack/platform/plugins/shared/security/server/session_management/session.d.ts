import type { KibanaRequest, Logger, SessionStorageSetOptions } from '@kbn/core/server';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SessionCookie } from './session_cookie';
import { SessionMissingError } from './session_errors';
import type { SessionIndex, SessionIndexValue } from './session_index';
import type { AuthenticationProvider } from '../../common';
import type { ConfigType } from '../config';
/**
 * The shape of the value that represents user's session information.
 */
export interface SessionValue<TState = unknown> {
    /**
     * Unique session ID.
     */
    sid: string;
    /**
     * Username this session belongs. It's defined only if session is authenticated, otherwise session
     * is considered unauthenticated (e.g. intermediate session used during SSO handshake).
     */
    username?: string;
    /**
     * Name and type of the provider this session belongs to.
     */
    provider: AuthenticationProvider;
    /**
     * The Unix time in ms when the session should be considered expired. If `null`, session will stay
     * active until the browser is closed.
     */
    idleTimeoutExpiration: number | null;
    /**
     * The Unix time in ms which is the max total lifespan of the session. If `null`, session expire
     * time can be extended indefinitely.
     */
    lifespanExpiration: number | null;
    /**
     * The Unix time in ms which is the time when the session was initially created. The value can also be 0 indicating
     * the migrated session that was created before `createdAt` field was introduced.
     */
    createdAt: number;
    /**
     * Session value that is fed to the authentication provider. The shape is unknown upfront and
     * entirely determined by the authentication provider that owns the current session.
     */
    state: TState;
    /**
     * Unique identifier of the user profile, if any. Not all users that have session will have an associated user
     * profile, e.g. anonymous users won't have it.
     */
    userProfileId?: string;
    /**
     * Indicates whether user acknowledged access agreement or not.
     */
    accessAgreementAcknowledged?: boolean;
    /**
     * Additional information about the session value.
     */
    metadata: {
        index: SessionIndexValue;
    };
}
export interface SessionOptions {
    readonly logger: Logger;
    readonly sessionIndex: PublicMethodsOf<SessionIndex>;
    readonly sessionCookie: PublicMethodsOf<SessionCookie>;
    readonly config: Pick<ConfigType, 'encryptionKey' | 'session'>;
    readonly audit: AuditServiceSetup;
}
export interface SessionValueContentToEncrypt {
    username?: string;
    userProfileId?: string;
    state: unknown;
}
/**
 * Filter provided for the `Session.invalidate` method that determines which session values should
 * be invalidated. It can have three possible types:
 *   - `all` means that all existing active and inactive sessions should be invalidated.
 *   - `current` means that session associated with the current request should be invalidated.
 *   - `query` means that only sessions that match specified query should be invalidated.
 */
export type InvalidateSessionsFilter = {
    match: 'all';
} | {
    match: 'current';
} | {
    match: 'query';
    query: {
        provider: {
            type: string;
            name?: string;
        };
        username?: string;
    };
};
/**
 * Returns last 10 characters of the session identifier. Referring to the specific session by its identifier is useful
 * for logging and debugging purposes, but we cannot include full session ID in logs because of the security reasons.
 * @param sid Full user session id
 */
export declare function getPrintableSessionId(sid: string): string;
export declare class Session {
    private readonly options;
    /**
     * Used to encrypt and decrypt portion of the session value using configured encryption key.
     */
    private readonly crypto;
    /**
     * Promise-based version of the NodeJS native `randomBytes`.
     */
    private readonly randomBytes;
    constructor(options: Readonly<SessionOptions>);
    /**
     * Extracts session id for the specified request.
     * @param request Request instance to get session value for.
     */
    getSID(request: KibanaRequest): Promise<string | undefined>;
    /**
     * Extracts session value for the specified request. Under the hood it can clear session if it is
     * invalid or created by the legacy versions of Kibana.
     * @param request Request instance to get session value for.
     */
    get(request: KibanaRequest): Promise<{
        error: SessionMissingError;
        value: null;
    } | {
        error: null;
        value: {
            idleTimeoutExpiration: number | null;
            sid: string;
            username?: string;
            provider: AuthenticationProvider;
            lifespanExpiration: number | null;
            createdAt: number;
            state: unknown;
            userProfileId?: string;
            accessAgreementAcknowledged?: boolean;
            metadata: {
                index: SessionIndexValue;
            };
        };
    }>;
    /**
     * Creates new session document in the session index encrypting sensitive state.
     * @param request Request instance to create session value for.
     * @param sessionValue Session value parameters.
     * @param stateCookieOptions Options to change the associated session cookie's properties
     */
    create(request: KibanaRequest, sessionValue: Readonly<Omit<SessionValue, 'sid' | 'idleTimeoutExpiration' | 'lifespanExpiration' | 'createdAt' | 'metadata'>>, stateCookieOptions?: SessionStorageSetOptions): Promise<Readonly<SessionValue<unknown>>>;
    /**
     * Updates session value for the specified request.
     * @param request Request instance to set session value for.
     * @param sessionValue Session value parameters.
     */
    update(request: KibanaRequest, sessionValue: Readonly<SessionValue>): Promise<Readonly<SessionValue<unknown>> | null>;
    /**
     * Extends existing session.
     * @param request Request instance to set session value for.
     * @param sessionValue Session value parameters.
     */
    extend(request: KibanaRequest, sessionValue: Readonly<SessionValue>): Promise<Readonly<SessionValue<unknown>> | null>;
    /**
     * Invalidates sessions that match the specified filter.
     * @param request Request instance initiated invalidation.
     * @param filter Filter that narrows down the list of the sessions that should be invalidated.
     */
    invalidate(request: KibanaRequest, filter: InvalidateSessionsFilter): Promise<number | undefined>;
    private calculateExpiry;
    /**
     * Converts value retrieved from the index to the value returned to the API consumers.
     * @param sessionIndexValue The value returned from the index.
     * @param decryptedContent Decrypted session value content.
     */
    private static sessionIndexValueToSessionValue;
    /**
     * Creates logger scoped to a specified session ID.
     * @param [sid] Session ID to create logger for.
     */
    private getLoggerForSID;
    /**
     * Generates a sha3-256 hash for the specified `username`. The hash is intended to be stored in
     * the session index to allow querying user specific sessions and don't expose the original
     * `username` at the same time.
     * @param username Username string to generate hash for.
     */
    private static getUsernameHash;
}
