/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { installMemoryWorkflows } from './install_managed_workflows';

const MEMORY_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
] as const;

const createClientMock = () =>
  ({
    install: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<Pick<PluginScopedManagedWorkflowsApi, 'install'>>);

describe('installMemoryWorkflows', () => {
  it('installs all four memory workflows globally', async () => {
    const client = createClientMock();

    await installMemoryWorkflows({
      client: client as unknown as PluginScopedManagedWorkflowsApi,
    });

    expect(client.install).toHaveBeenCalledTimes(MEMORY_WORKFLOW_IDS.length);
    for (const workflowId of MEMORY_WORKFLOW_IDS) {
      expect(client.install).toHaveBeenCalledWith(workflowId, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });
    }
  });

  it('aggregates install failures instead of failing on the first rejection', async () => {
    const client = createClientMock();
    client.install
      .mockRejectedValueOnce(new Error('synthesis boom'))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('scraper boom'))
      .mockResolvedValueOnce(undefined);

    await expect(
      installMemoryWorkflows({
        client: client as unknown as PluginScopedManagedWorkflowsApi,
      })
    ).rejects.toThrow(
      `Failed to install memory workflows: [${SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID} (synthesis boom); ${SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID} (scraper boom)]`
    );

    expect(client.install).toHaveBeenCalledTimes(MEMORY_WORKFLOW_IDS.length);
  });
});
