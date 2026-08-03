/**
 * Defensive caps for the OAuth client management API exposed under
 * `/internal/security/oauth/clients`.
 */
/**
 * Maximum length of the base64-encoded `data` payload of an OAuth client logo.
 */
export declare const OAUTH_CLIENT_LOGO_MAX_DATA_LENGTH = 262144;
/**
 * Maximum length of an OAuth client's human-readable display name.
 */
export declare const OAUTH_CLIENT_NAME_MAX_LENGTH = 128;
/**
 * Maximum length of an OAuth connection's human-readable display name.
 */
export declare const OAUTH_CONNECTION_NAME_MAX_LENGTH = 128;
/**
 * Upper bound on the number of redirect URIs that may be registered against a
 * single OAuth client.
 */
export declare const OAUTH_REDIRECT_URIS_MAX_SIZE = 20;
/**
 * Generic cap for short, identifier/name-like string fields on the OAuth
 * client management API.
 */
export declare const OAUTH_MAX_STRING_FIELD_LENGTH = 1024;
/**
 * Cap for URI-like string fields on the OAuth client management API
 * (redirect URIs).
 */
export declare const OAUTH_MAX_URI_LENGTH = 2048;
/**
 * Upper bound on the number of `(client_id, connection_id)` targets that
 * may be submitted in a single call to the bulk connection revocation API.
 */
export declare const OAUTH_MAX_BULK_REVOKE_CONNECTIONS = 100;
/**
 * Image media types accepted by the OAuth client management API for the
 * `client_logo.media_type` field.
 */
export declare const OAUTH_CLIENT_LOGO_MEDIA_TYPES: readonly ["image/png", "image/jpeg", "image/gif"];
export type OAuthClientLogoMediaType = (typeof OAUTH_CLIENT_LOGO_MEDIA_TYPES)[number];
export declare const isOAuthClientLogoMediaType: (value: string) => value is OAuthClientLogoMediaType;
