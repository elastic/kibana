/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IamPolicyDocument } from './iam_policy_document';

/** Internal endpoint path for IAM permissions. */
export const IAM_PERMISSIONS_API_PATH = '/internal/onboarding/iam_permissions';

/**
 * Response shape for `GET /internal/onboarding/iam_permissions?services=...`
 *
 * - `merged`    — deduped union of all requested services' permissions.
 * - `byService` — per-service policy documents; keyed by service id.
 *
 * The UI reads from `merged` for the "All integrations" view and from
 * `byService[id]` for the per-service toggle — no second request needed.
 */
export interface GetIamPermissionsResponse {
  merged: IamPolicyDocument;
  byService: Record<string, IamPolicyDocument>;
}
