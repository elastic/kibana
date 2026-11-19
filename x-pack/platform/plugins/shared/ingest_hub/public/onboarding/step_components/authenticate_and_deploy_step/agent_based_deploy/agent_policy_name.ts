/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendGetAgentPolicies, incrementPolicyName } from '@kbn/fleet-plugin/public';

/**
 * Returns the next available agent policy name, e.g. "Agent policy 1", "Agent policy 2", …
 * Reuses Fleet's own `incrementPolicyName` so the naming is consistent with Fleet's UI.
 *
 * Falls back to "Agent policy 1" if the fetch fails.
 */
export async function buildAgentPolicyName(): Promise<string> {
  try {
    const resp = await sendGetAgentPolicies({ perPage: 1000 });
    const existing = resp.data?.items ?? [];
    return incrementPolicyName(existing);
  } catch {
    return incrementPolicyName([]);
  }
}
