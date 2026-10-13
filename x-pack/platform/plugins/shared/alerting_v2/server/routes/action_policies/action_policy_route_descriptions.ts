/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ACTION_POLICY_NOT_FOUND_DESCRIPTION =
  'Indicates an action policy with the given ID does not exist.';

export const ACTION_POLICY_VERSION_CONFLICT_DESCRIPTION =
  'Indicates the action policy was concurrently updated by another caller.';

export const ACTION_POLICY_LICENSE_FORBIDDEN_DESCRIPTION =
  'Indicates the user does not have the required privileges, or the current license does not support action policies. Creating, updating, and enabling action policies requires an active Enterprise license.';

export const ACTION_POLICY_UPSERT_CONFLICT_DESCRIPTION =
  'Indicates the action policy was created or updated concurrently by another caller.';
