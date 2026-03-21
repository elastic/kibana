import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AuthenticationInfo } from '../elasticsearch';
/**
 * Represents a pair of access and refresh tokens.
 */
export interface TokenPair {
    /**
     * Access token issued as the result of successful authentication and that should be provided with
     * every request to Elasticsearch on behalf of the authenticated user. This token will eventually expire.
     */
    readonly accessToken: string;
    /**
     * Once access token expires the refresh token is used to get a new pair of access/refresh tokens
     * without any user involvement. If not used this token will eventually expire as well.
     */
    readonly refreshToken: string;
}
/**
 * Represents the result of the token refresh operation.
 */
export interface RefreshTokenResult extends TokenPair {
    authenticationInfo: AuthenticationInfo;
}
/**
 * Class responsible for managing access and refresh tokens (refresh, invalidate, etc.) used by
 * various authentication providers.
 */
export declare class Tokens {
    private readonly options;
    /**
     * Logger instance bound to `tokens` context.
     */
    private readonly logger;
    constructor(options: Readonly<{
        client: ElasticsearchClient;
        logger: Logger;
    }>);
    /**
     * Tries to exchange provided refresh token to a new pair of access and refresh tokens.
     * @param existingRefreshToken Refresh token to send to the refresh token API.
     */
    refresh(existingRefreshToken: string): Promise<RefreshTokenResult>;
    /**
     * Tries to invalidate provided access and refresh token pair. At least one of the tokens should
     * be specified.
     * @param [accessToken] Optional access token to invalidate.
     * @param [refreshToken] Optional refresh token to invalidate.
     */
    invalidate({ accessToken, refreshToken }: Partial<TokenPair>): Promise<void>;
    /**
     * Tries to determine whether specified error that occurred while trying to authenticate request
     * using access token happened because access token is expired. We treat all `401 Unauthorized`
     * as such.
     * @param err Error returned from Elasticsearch.
     */
    static isAccessTokenExpiredError(err?: any): boolean;
}
