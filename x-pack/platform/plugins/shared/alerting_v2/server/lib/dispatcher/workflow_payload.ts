/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionGroup, ActionPolicyWorkflowPayload } from './types';

/** Builds the payload a destination workflow receives as `inputs.payload` for an action group. */
export const toWorkflowPayload = ({
  id,
  policyId,
  groupKey,
  alerts,
  rules,
}: ActionGroup): ActionPolicyWorkflowPayload => ({
  id,
  policyId,
  groupKey,
  alerts,
  rules,
});
