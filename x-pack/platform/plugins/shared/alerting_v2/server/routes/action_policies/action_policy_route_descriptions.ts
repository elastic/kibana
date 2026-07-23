/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Action-policy route response `description` values, reused as the `summary` of
 * the matching OAS error examples. Importing these in both the route schema and
 * the OAS example keeps the documented shape aligned with what clients receive.
 */

export const ACTION_POLICY_NOT_FOUND_DESCRIPTION =
  'Indicates an action policy with the given ID does not exist.';

export const ACTION_POLICY_VERSION_CONFLICT_DESCRIPTION =
  'Indicates the action policy was concurrently updated by another caller.';

export const ACTION_POLICY_UPSERT_CONFLICT_DESCRIPTION =
  'Indicates the action policy was created or updated concurrently by another caller.';
