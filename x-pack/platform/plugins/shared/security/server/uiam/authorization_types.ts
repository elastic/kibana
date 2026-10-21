/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The resource an authorization check is evaluated against. UIAM identifies resources by type and
 * any attributes that type needs, such as `organization_id`.
 */
export interface UiamAuthorizationResource {
  type: string;
  [attribute: string]: string;
}

/**
 * A single authorization check: whether the current user may perform `action` on `resource`.
 */
export interface UiamAuthorizationCheck {
  action: string;
  resource: UiamAuthorizationResource;
}

/**
 * The outcome of one {@link UiamAuthorizationCheck}.
 */
export interface UiamAuthorizationCheckResult extends UiamAuthorizationCheck {
  permitted: boolean;
}

/**
 * The outcome of an authorization check request. `permitted` is `true` only when every check
 * was permitted.
 */
export interface UiamAuthorizationResult {
  permitted: boolean;
  checks: UiamAuthorizationCheckResult[];
}
