/**
 * Represents client authentication information. Don't confuse with the authentication information which represents an
 * authenticated user. For example, if Kibana is making a request to Elasticsearch on behalf of an authenticated user, the
 * client authentication information would represent Kibana's own authentication information (e.g. shared secret), not the
 * end user's.
 */
export interface ClientAuthentication {
    /**
     * The authentication scheme. Currently only `SharedSecret` scheme is supported.
     */
    readonly scheme: 'SharedSecret' | string;
    /**
     * The authentication credentials for the scheme.
     */
    readonly value: string;
}
