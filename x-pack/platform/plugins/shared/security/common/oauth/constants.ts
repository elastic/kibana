/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Defensive caps for the OAuth client management API exposed under
 * `/internal/security/oauth/clients`.
 */

/**
 * Maximum length of the base64-encoded `data` payload of an OAuth client logo.
 */
export const OAUTH_CLIENT_LOGO_MAX_DATA_LENGTH = 262144;

/**
 * Maximum length of an OAuth client's human-readable display name.
 */
export const OAUTH_CLIENT_NAME_MAX_LENGTH = 128;

/**
 * Maximum length of an OAuth connection's human-readable display name.
 */
export const OAUTH_CONNECTION_NAME_MAX_LENGTH = 128;

/**
 * Upper bound on the number of redirect URIs that may be registered against a
 * single OAuth client.
 */
export const OAUTH_REDIRECT_URIS_MAX_SIZE = 20;

/**
 * Generic cap for short, identifier/name-like string fields on the OAuth
 * client management API.
 */
export const OAUTH_MAX_STRING_FIELD_LENGTH = 1024;

/**
 * Cap for URI-like string fields on the OAuth client management API
 * (redirect URIs).
 */
export const OAUTH_MAX_URI_LENGTH = 2048;

/**
 * Upper bound on the number of `(client_id, connection_id)` targets that
 * may be submitted in a single call to the bulk connection revocation API.
 */
export const OAUTH_MAX_BULK_REVOKE_CONNECTIONS = 100;

/**
 * Image media types accepted by the OAuth client management API for the
 * `client_logo.media_type` field.
 */
export const OAUTH_CLIENT_LOGO_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/gif'] as const;

export type OAuthClientLogoMediaType = (typeof OAUTH_CLIENT_LOGO_MEDIA_TYPES)[number];

export const isOAuthClientLogoMediaType = (value: string): value is OAuthClientLogoMediaType =>
  OAUTH_CLIENT_LOGO_MEDIA_TYPES.includes(value as OAuthClientLogoMediaType);
