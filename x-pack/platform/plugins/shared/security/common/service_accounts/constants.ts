/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maximum length of a service account's human-readable display name.
 */
export const SERVICE_ACCOUNT_NAME_MAX_LENGTH = 128;

/**
 * Generic cap for identifier/name-like string fields on the service account
 * management API.
 */
export const SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH = 1024;

/**
 * Cap on the length of an ephemeral service account token returned by UIAM's token exchange.
 * Those tokens are self-described, so the cap is generous and only exists to bound the validated
 * payload. The long-lived Elasticsearch token is a different shape with its own bound, in
 * {@link ES_SERVICE_ACCOUNT_TOKEN_MAX_LENGTH}.
 */
export const SERVICE_ACCOUNT_TOKEN_MAX_LENGTH = 16384;

/**
 * Character set a service account name must match, mirroring Elasticsearch's
 * `Validation.UserManagedServiceAccounts`. Applied on both backends: the name is
 * interpolated into an Elasticsearch URL path, so this is also what keeps a name
 * like `../_cluster/settings` from reaching the transport layer.
 */
export const SERVICE_ACCOUNT_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

/**
 * The Elasticsearch namespace every Kibana-created service account lives under. Fixed, so
 * that callers choose a bare name on both backends; `elastic` is reserved by Elasticsearch
 * for its built-in accounts.
 */
export const ES_SERVICE_ACCOUNT_NAMESPACE = 'kibana';

/**
 * Name of the single Elasticsearch service account token Kibana mints and manages per
 * account. Constant rather than generated, so the credential can be found and cleaned up
 * from the account name alone.
 */
export const ES_SERVICE_ACCOUNT_TOKEN_NAME = 'kibana-managed';

/**
 * Cap on the length of the long-lived Elasticsearch service account token Kibana mints. The value
 * encodes the principal, the token name and a secret, so it is far shorter than this. Generous on
 * purpose, and only there to bound the validated response.
 */
export const ES_SERVICE_ACCOUNT_TOKEN_MAX_LENGTH = 1024;

/**
 * Cap on how many roles one service account may be given, on either backend.
 *
 * UIAM allows 50 application roles per role assignment, because the roles are encoded into every
 * token it mints. Elasticsearch allows 1,000 and declined to lower that, so Kibana holds both
 * backends to the smaller number rather than let the same request succeed on one and fail on the
 * other.
 */
export const SERVICE_ACCOUNT_MAX_ROLES = 50;

/**
 * Cap on the length of one role name Kibana will send. UIAM's bound for a role id. Elasticsearch
 * accepts role names up to {@link SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH}, so a role with a
 * longer name cannot be attached to a service account through Kibana, and the same reasoning as
 * {@link SERVICE_ACCOUNT_MAX_ROLES} applies.
 */
export const SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH = 507;

/**
 * How many roles Elasticsearch itself allows on a user-managed service account. Bounds what Kibana
 * is willing to read back from Elasticsearch, as opposed to {@link SERVICE_ACCOUNT_MAX_ROLES},
 * which bounds what it sends: an account written outside Kibana, or before the lower cap, may
 * hold up to this many, and must still read as "taken" rather than as unreadable.
 */
export const ES_SERVICE_ACCOUNT_MAX_ROLES = 1000;

/**
 * Cap on the size of a create request body, which holds a name bounded by
 * {@link SERVICE_ACCOUNT_NAME_MAX_LENGTH} plus a role list bounded by
 * {@link SERVICE_ACCOUNT_MAX_ROLES} and {@link SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH}. Those add up
 * to under 30 KB, so a request within the field-level bounds never meets this limit, whose 413
 * carries no field-level message.
 */
export const SERVICE_ACCOUNT_CREATE_MAX_BODY_BYTES = 64 * 1024;
