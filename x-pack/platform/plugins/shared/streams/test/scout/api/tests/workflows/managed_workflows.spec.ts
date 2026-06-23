/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { KbnClient } from '@kbn/scout';
import {
  SIGEVENTS_DETECTION_WORKFLOW_ID,
  SIGEVENTS_DISCOVERY_WORKFLOW_ID,
  SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGEVENTS_TRIAGE_WORKFLOW_ID,
  STREAMS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  STREAMS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  STREAMS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { streamsApiTest as apiTest } from '../../fixtures';

interface WorkflowDto {
  id: string;
  enabled: boolean;
  valid: boolean;
  yaml: string;
}

/** Poll until the workflow appears in the default space or timeout. */
async function waitForWorkflow(
  kbnClient: KbnClient,
  id: string,
  { timeoutMs = 20_000 } = {}
): Promise<WorkflowDto> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await kbnClient.request<WorkflowDto>({
      method: 'GET',
      path: `/api/workflows/workflow/${id}`,
      ignoreErrors: [404],
    });
    if (response.status === 200) return response.data;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Workflow ${id} was not installed within ${timeoutMs}ms`);
}

const SIGEVENT_WORKFLOW_IDS = [
  SIGEVENTS_DETECTION_WORKFLOW_ID,
  SIGEVENTS_DISCOVERY_WORKFLOW_ID,
  SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGEVENTS_TRIAGE_WORKFLOW_ID,
];

const MEMORY_WORKFLOW_IDS = [
  STREAMS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  STREAMS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  STREAMS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
];

apiTest.describe(
  'Built-in sigevent and memory managed workflows',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.streamsTest.enableMemory();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.streamsTest.disableMemory();
    });

    apiTest.describe('sigevent workflows — always installed', () => {
      for (const workflowId of SIGEVENT_WORKFLOW_IDS) {
        apiTest(`${workflowId}: is installed and valid`, async ({ kbnClient }) => {
          const workflow = await waitForWorkflow(kbnClient, workflowId);

          expect(workflow.valid).toBe(true);
        });

        apiTest(`${workflowId}: can be enabled without validation errors`, async ({ kbnClient }) => {
          const enableResponse = await kbnClient.request<WorkflowDto>({
            method: 'PUT',
            path: `/api/workflows/workflow/${workflowId}`,
            body: { enabled: true },
          });

          expect(enableResponse.status).toBe(200);
          expect(enableResponse.data.enabled).toBe(true);

          // Revert — sigevent workflows are enforced-enabled by their definition,
          // but we explicitly restore for test isolation.
          await kbnClient.request({
            method: 'PUT',
            path: `/api/workflows/workflow/${workflowId}`,
            body: { enabled: false },
          });
        });
      }
    });

    apiTest.describe('memory workflows — installed when feature flag is enabled', () => {
      for (const workflowId of MEMORY_WORKFLOW_IDS) {
        apiTest(`${workflowId}: is installed and valid`, async ({ kbnClient }) => {
          const workflow = await waitForWorkflow(kbnClient, workflowId);

          expect(workflow.valid).toBe(true);
        });

        apiTest(`${workflowId}: can be enabled without validation errors`, async ({ kbnClient }) => {
          // Ensure the workflow is present before trying to enable it.
          await waitForWorkflow(kbnClient, workflowId);

          const enableResponse = await kbnClient.request<WorkflowDto>({
            method: 'PUT',
            path: `/api/workflows/workflow/${workflowId}`,
            body: { enabled: true },
          });

          expect(enableResponse.status).toBe(200);
          expect(enableResponse.data.enabled).toBe(true);

          // Revert to the initial disabled state so the workflow stays inactive.
          await kbnClient.request({
            method: 'PUT',
            path: `/api/workflows/workflow/${workflowId}`,
            body: { enabled: false },
          });
        });
      }
    });
  }
);
