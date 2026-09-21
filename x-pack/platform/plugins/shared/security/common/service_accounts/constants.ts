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
 * Role assigned when Kibana cannot work out what to give a new Elasticsearch service account —
 * that is, when the caller named no roles and their own credentials report none, as an API-key
 * authentication does. Creating the account requires `manage_security`, which Elasticsearch
 * treats as transitively granting full access, so this escalates nothing the caller could not
 * already do; it is nonetheless the widest possible grant, and Kibana warns when it applies.
 */
export const ES_SERVICE_ACCOUNT_FALLBACK_ROLE = 'superuser';

/**
 * Cap on how many roles one service account may be given.
 *
 * TODO: the right upper bound is still being decided. Elasticsearch caps no role count of its
 * own, so this number is Kibana's alone, and it does not agree with
 * {@link SERVICE_ACCOUNT_CREATE_MAX_BODY_BYTES}: 1000 roles at
 * {@link SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH} characters each is ~1 MB of JSON, so the body
 * cap is what a caller meets first, at roughly 63 max-length roles.
 */
export const SERVICE_ACCOUNT_MAX_ROLES = 1000;

/**
 * Cap on the size of a create request body, which holds a name bounded by
 * {@link SERVICE_ACCOUNT_NAME_MAX_LENGTH} plus an optional role list. In practice this is also
 * the limit on how many roles one request can name, and a request that overruns it gets a 413
 * with no field-level message. See {@link SERVICE_ACCOUNT_MAX_ROLES} for the open question about
 * how the two should relate.
 */
export const SERVICE_ACCOUNT_CREATE_MAX_BODY_BYTES = 64 * 1024;
