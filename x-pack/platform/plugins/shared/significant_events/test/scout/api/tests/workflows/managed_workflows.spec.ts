/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { PUBLIC_API_HEADERS } from '../../fixtures/constants';

// Inline IDs to avoid pulling in @kbn/workflows which imports YAML files that
// Playwright's esbuild transform cannot load. These strings are stable managed
// workflow identifiers defined in @kbn/workflows managed/definitions.
const MANAGED_WORKFLOW_IDS = [
  // Base significant events workflows (installed when significant events is available)
  'system-significant-events-discovery',
  'system-significant-events-triage',
  // Memory workflows (installed when the memory feature flag is enabled)
  'system-streams-memory-synthesis',
  'system-streams-memory-consolidation',
  'system-streams-memory-conversation-scraper',
];

/**
 * Verifies that managed workflows are installed and marked as valid. Significant events
 * availability is enabled in global setup; memory workflows additionally require the
 * memory feature flag. Installation is asynchronous (triggered by a reactive observable
 * in plugin start), so each check polls until the workflow appears as valid.
 */
apiTest.describe(
  'Managed workflows',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.significantEventsTest.enableMemory();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.significantEventsTest.disableMemory();
    });

    for (const workflowId of MANAGED_WORKFLOW_IDS) {
      apiTest(`${workflowId}: is installed and valid`, async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const headers = { ...PUBLIC_API_HEADERS, ...cookieHeader };

        await expect
          .poll(
            async () => {
              const response = await apiClient.get(`api/workflows/workflow/${workflowId}`, {
                headers,
                responseType: 'json',
              });
              return response.statusCode === 200 ? response.body.valid : false;
            },
            { timeout: 20_000, intervals: [1_000] }
          )
          .toBe(true);
      });
    }
  }
);
