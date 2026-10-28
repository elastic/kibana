/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout/src/playwright/fixtures/scope/worker';
import { expect } from '@kbn/scout/api';

export const waitForSuccessfulEventLogEntry = async (
  apiClient: ApiClientFixture,
  ruleId: string,
  headers: Record<string, string>
) => {
  const dateStart = new Date().toISOString();
  // Force an immediate run so we don't depend on the scheduler's poll cadence.
  await apiClient.post(`internal/alerting/rule/${ruleId}/_run_soon`, { headers });
  let body: { data: Array<{ status: string }> } = { data: [] };
  await expect
    .poll(
      async () => {
        const logResponse = await apiClient.get(
          `internal/alerting/rule/${ruleId}/_execution_log?date_start=${encodeURIComponent(
            dateStart
          )}&per_page=10`,
          { headers, responseType: 'json' }
        );
        body = logResponse.body as { data: Array<{ status: string }> };
        return body.data.some((entry) => entry.status === 'success');
      },
      {
        // ~covers Cloud/MKI task-claim + event-log write latency; restores the budget from #273036
        // that regressed to 30s when this helper was rewritten to expect.poll in #273804.
        timeout: 120_000,
        intervals: [2_000],
        message: `Rule ${ruleId} did not execute successfully`,
      }
    )
    .toBe(true);
  return body;
};
