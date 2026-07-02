export declare class BasicHTTPAuthorizationHeaderCredentials {
    /**
     * Username, referred to as the `user-id` in https://tools.ietf.org/html/rfc7617.
     */
    readonly username: string;
    /**
     * Password used to authenticate
     */
    readonly password: string;
    constructor(username: string, password: string);
    /**
     * Parses the username and password from the credentials included in a HTTP Authorization header
     * for the Basic scheme https://tools.ietf.org/html/rfc7617
     * @param credentials The credentials extracted from the HTTP Authorization header
     */
    static parseFromCredentials(credentials: string): BasicHTTPAuthorizationHeaderCredentials;
    toString(): string;
}
