/**
 * The identifier in a saved object's `namespaces` array when it is shared globally to all spaces.
 */
export declare const ALL_SPACES_ID = "*";
/**
 * The identifier in a saved object's `namespaces` array when it is shared to an unknown space (e.g., one that the end user is not authorized to see).
 */
export declare const UNKNOWN_SPACE = "?";
export declare const APPLICATION_PREFIX = "kibana-";
/**
 * The wildcard identifier for all application privileges.
 */
export declare const PRIVILEGES_ALL_WILDCARD = "*";
/**
 * Reserved application privileges are always assigned to this "wildcard" application.
 * This allows them to be applied to any Kibana "tenant" (`kibana.index`). Since reserved privileges are always assigned to reserved (built-in) roles,
 * it's not possible to know the tenant ahead of time.
 */
export declare const RESERVED_PRIVILEGES_APPLICATION_WILDCARD = "kibana-*";
/**
 * This is the key of a query parameter that contains the name of the authentication provider that should be used to
 * authenticate request. It's also used while the user is being redirected during single-sign-on authentication flows.
 * That query parameter is discarded after the authentication flow succeeds. See the `Authenticator`,
 * `OIDCAuthenticationProvider`, and `SAMLAuthenticationProvider` classes for more information.
 */
export declare const AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER = "auth_provider_hint";
/**
 * This is the key of a query parameter that contains metadata about the (client-side) URL hash while the user is being
 * redirected during single-sign-on authentication flows. That query parameter is discarded after the authentication
 * flow succeeds. See the `Authenticator`, `OIDCAuthenticationProvider`, and `SAMLAuthenticationProvider` classes for
 * more information.
 */
export declare const AUTH_URL_HASH_QUERY_STRING_PARAMETER = "auth_url_hash";
export declare const LOGOUT_PROVIDER_QUERY_STRING_PARAMETER = "provider";
export declare const LOGOUT_REASON_QUERY_STRING_PARAMETER = "msg";
export declare const NEXT_URL_QUERY_STRING_PARAMETER = "next";
/**
 * If there's a problem validating the session supplied in an AJAX request (i.e. a non-redirectable request),
 * a 401 error is returned. A header with the name defined in `SESSION_ERROR_REASON_HEADER` is added to the
 * HTTP response with more details of the problem.
 */
export declare const SESSION_ERROR_REASON_HEADER = "kbn-session-error-reason";
/**
 * Indicates that any authentication optimizations (e.g., minimal authentication mode) should be disabled and the full
 * authentication information should be made available.
 */
export declare const KIBANA_AUTH_FULL_HEADER = "kbn-auth-full";
/**
 * The HTTP header that's supposed to carry the client ES authentication information when needed (e.g.,
 * UIAM shared secret).
 */
export declare const ES_CLIENT_AUTHENTICATION_HEADER = "x-client-authentication";
/**
 * Matches valid usernames and role names.
 *
 * - Must contain only letters, numbers, spaces, punctuation and printable symbols.
 * - Must not contain leading or trailing spaces.
 */
export declare const NAME_REGEX: RegExp;
/**
 * Matches valid usernames and role names for serverless offering.
 *
 * - Must contain only alphanumeric characters, and non-leading dots, hyphens, or underscores.
 * - Must not contain white spaces characters.
 * - Must not have a leading dot, hyphen, or underscore.
 */
export declare const SERVERLESS_NAME_REGEX: RegExp;
/**
 * Maximum length of usernames and role names.
 */
export declare const MAX_NAME_LENGTH = 1024;
/**
 * Client session timeout is decreased by this number so that Kibana server can still access session
 * content during logout request to properly clean user session up (invalidate access tokens,
 * redirect to logout portal etc.).
 */
export declare const SESSION_GRACE_PERIOD_MS: number;
/**
 * Duration we'll normally display the warning toast
 */
export declare const SESSION_EXPIRATION_WARNING_MS: number;
/**
 * Current session info is checked this number of milliseconds before the warning toast shows. This
 * will prevent the toast from being shown if the session has already been extended.
 */
export declare const SESSION_CHECK_MS = 1000;
/**
 * Session will be extended at most once this number of milliseconds while user activity is detected.
 */
export declare const SESSION_EXTENSION_THROTTLE_MS: number;
/**
 * Route to get session info and extend session expiration
 */
export declare const SESSION_ROUTE = "/internal/security/session";
/**
 * Allowed image file types for uploading an image as avatar
 */
export declare const IMAGE_FILE_TYPES: string[];
/**
 * Prefix for API actions.
 */
export declare const API_OPERATION_PREFIX = "api:";
/**
 * The API version numbers used with the versioned router.
 */
export declare const API_VERSIONS: {
    roles: {
        public: {
            v1: string;
        };
    };
};
/**
 * Privileges that define the superuser role or the role equivalent to the superuser role.
 */
export declare const SUPERUSER_PRIVILEGES: {
    kibana: string[];
    elasticsearch: {
        cluster: string[];
        index: {
            '*': string[];
        };
    };
};
