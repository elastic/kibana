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
 * Cap on the length of an ephemeral service account token returned by the token
 * exchange. Ephemeral tokens are self-described, so the cap is generous; it only
 * exists to bound the validated payload.
 */
export const SERVICE_ACCOUNT_TOKEN_MAX_LENGTH = 16384;

/**
 * Cap on the size of a create request body. The shape of `role_assignments` is
 * not pinned down by the upstream specification yet, so the field itself cannot
 * be tightly validated; this bounds the payload as a whole instead.
 *
 * TODO(https://github.com/elastic/kibana/issues/284463): tighten the
 * `role_assignments` schema once the specification is confirmed, and reassess
 * whether this cap is still needed.
 */
export const SERVICE_ACCOUNT_CREATE_MAX_BODY_BYTES = 16384;

/**
 * Cap on a single page of listed service accounts. UIAM's `limit` is optional;
 * this is Kibana's bound on the query parameter.
 */
export const SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE = 100;
