/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import {
  STREAMS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  STREAMS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  STREAMS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { streamsApiTest as apiTest } from '../../fixtures';

const MEMORY_WORKFLOW_IDS = [
  STREAMS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  STREAMS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  STREAMS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
];

apiTest.describe(
  'Memory managed workflows',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.streamsTest.enableMemory();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.streamsTest.disableMemory();
    });

    for (const workflowId of MEMORY_WORKFLOW_IDS) {
      apiTest(`${workflowId}: is installed and valid`, async ({ kbnClient }) => {
        const deadline = Date.now() + 20_000;
        let workflow: { valid: boolean } | null = null;

        while (Date.now() < deadline) {
          const response = await kbnClient.request<{ valid: boolean }>({
            method: 'GET',
            path: `/api/workflows/workflow/${workflowId}`,
            ignoreErrors: [404],
          });
          if (response.status === 200) {
            workflow = response.data;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1_000));
        }

        expect(workflow).not.toBeNull();
        expect(workflow!.valid).toBe(true);
      });
    }
  }
);
