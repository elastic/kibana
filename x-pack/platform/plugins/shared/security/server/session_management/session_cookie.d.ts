import type { HttpServiceSetup, KibanaRequest, Logger, SessionStorageSetOptions } from '@kbn/core/server';
import type { ConfigType } from '../config';
/**
 * Represents shape of the session value stored in the cookie.
 */
export interface SessionCookieValue {
    /**
     * Unique session ID.
     */
    sid: string;
    /**
     * Unique random value used as Additional authenticated data (AAD) while encrypting/decrypting
     * sensitive or PII session content stored in the Elasticsearch index. This value is only stored
     * in the user cookie.
     */
    aad: string;
    /**
     * Kibana server base path the session was created for.
     */
    path: string;
    /**
     * The Unix time in ms when the session should be considered expired. If `null`, session will stay
     * active until the max lifespan is reached.
     */
    idleTimeoutExpiration: number | null;
    /**
     * The Unix time in ms which is the max total lifespan of the session. If `null`, session expire
     * time can be extended indefinitely.
     */
    lifespanExpiration: number | null;
}
export interface SessionCookieOptions {
    logger: Logger;
    serverBasePath: string;
    createCookieSessionStorageFactory: HttpServiceSetup['createCookieSessionStorageFactory'];
    config: Pick<ConfigType, 'encryptionKey' | 'secureCookies' | 'cookieName' | 'sameSiteCookies'>;
}
export declare class SessionCookie {
    /**
     * Promise containing initialized cookie session storage factory.
     */
    private readonly cookieSessionValueStorage;
    /**
     * Session cookie logger.
     */
    private readonly logger;
    /**
     * Base path of the Kibana server instance.
     */
    private readonly serverBasePath;
    constructor({ config, createCookieSessionStorageFactory, logger, serverBasePath, }: Readonly<SessionCookieOptions>);
    /**
     * Extracts session value for the specified request.
     * @param request Request instance to get session value for.
     */
    get(request: KibanaRequest): Promise<SessionCookieValue | null>;
    /**
     * Sets session value for the specified request.
     * @param request Request instance to set session value for.
     * @param sessionValue Session value parameters.
     * @param options Optional overrides for cookie attributes (isSecure, sameSite).
     */
    set(request: KibanaRequest, sessionValue: Readonly<Omit<SessionCookieValue, 'path'>>, options?: SessionStorageSetOptions): Promise<void>;
    /**
     * Clears session value for the specified request.
     * @param request Request instance to clear session value for.
     */
    clear(request: KibanaRequest): Promise<void>;
    /**
     * Determines if session value was created by the current Kibana version. Previous versions had a different session value format.
     * @param sessionValue The session value to check.
     */
    private static isSupportedSessionValue;
}
