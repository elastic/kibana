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
 * Cap on the length of an ephemeral token UIAM mints, whether from a service account's token
 * exchange or for Kibana's own system identity. Sized to hold the longest token UIAM will issue,
 * so Kibana never rejects one UIAM was willing to mint.
 *
 * An exchanged token carries the account's role names and a snapshot of its creator's, so its
 * length follows the roles. UIAM signs a JWT of up to 65,536 bytes, then
 * compresses, checksums, base64-encodes and prefixes it. Incompressible input makes that ~88K
 * characters, which this cap covers with room to spare.
 */
export const SERVICE_ACCOUNT_TOKEN_MAX_LENGTH = 128 * 1024;

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
 * The limits one backend puts on the roles a service account is created with. Each backend
 * defines and enforces its own, so a request can succeed on one backend and fail on the other.
 */
export interface ServiceAccountRoleLimits {
  /** The most distinct roles one account may be given. */
  readonly maxRoles: number;
  /** The longest role name the backend accepts. */
  readonly maxRoleNameLength: number;
}

/**
 * Cap on a single page of listed service accounts.
 */
export const SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE = 100;
