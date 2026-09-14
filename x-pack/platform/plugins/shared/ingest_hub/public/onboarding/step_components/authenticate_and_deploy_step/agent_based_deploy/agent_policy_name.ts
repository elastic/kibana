/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendGetAgentPolicies } from '@kbn/fleet-plugin/public';

export const POLICY_NAME_PREFIX = 'AWS Agent Policy';

/**
 * Returns the next available agent policy name using Fleet's numbering pattern:
 * "AWS Agent Policy 1", "AWS Agent Policy 2", …
 *
 * Fetches existing policies matching the prefix and picks max(existing numbers) + 1.
 * Falls back to "AWS Agent Policy 1" if the fetch fails or no matches exist.
 */
export async function buildAgentPolicyName(): Promise<string> {
  try {
    const resp = await sendGetAgentPolicies({ perPage: 1000 });
    const existing = resp.data?.items ?? [];
    const numbers = existing
      .map((p) => {
        const match = p.name.match(/^AWS Agent Policy (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${POLICY_NAME_PREFIX} ${next}`;
  } catch {
    return `${POLICY_NAME_PREFIX} 1`;
  }
}
