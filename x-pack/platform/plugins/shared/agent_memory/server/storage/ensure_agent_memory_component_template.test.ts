/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { getSchemaVersion } from '@kbn/storage-adapter';
import {
  deleteAgentMemoryMappingsComponentTemplate,
  ensureAgentMemoryMappingsComponentTemplate,
} from './ensure_agent_memory_component_template';
import {
  AGENT_MEMORY_MAPPINGS_COMPONENT_TEMPLATE,
  agentMemoryMappingsComponentProperties,
  memoryStorageSettings,
} from './memory_storage';

describe('Agent Memory component template', () => {
  const putComponentTemplate = jest.fn().mockResolvedValue({});
  const deleteComponentTemplate = jest.fn().mockResolvedValue({});
  const esClient = {
    cluster: {
      putComponentTemplate,
      deleteComponentTemplate,
    },
  } as unknown as ElasticsearchClient;
  const logger = loggerMock.create();

  beforeEach(async () => {
    await deleteAgentMemoryMappingsComponentTemplate({ esClient });
    jest.clearAllMocks();
    putComponentTemplate.mockResolvedValue({});
  });

  it('installs only the Agent Memory-owned mappings with schema metadata', async () => {
    await ensureAgentMemoryMappingsComponentTemplate({ esClient, logger });

    expect(putComponentTemplate).toHaveBeenCalledWith({
      name: AGENT_MEMORY_MAPPINGS_COMPONENT_TEMPLATE,
      _meta: {
        managed: true,
        managed_by: 'agentMemory',
        version: getSchemaVersion(memoryStorageSettings),
      },
      template: {
        mappings: {
          properties: agentMemoryMappingsComponentProperties,
        },
      },
    });
  });

  it('shares concurrent installation for the same schema version', async () => {
    let resolveInstallation: (() => void) | undefined;
    putComponentTemplate.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveInstallation = resolve;
      })
    );

    const firstInstall = ensureAgentMemoryMappingsComponentTemplate({ esClient, logger });
    const secondInstall = ensureAgentMemoryMappingsComponentTemplate({ esClient, logger });

    expect(putComponentTemplate).toHaveBeenCalledTimes(1);
    resolveInstallation?.();
    await Promise.all([firstInstall, secondInstall]);
  });

  it('retries after a failed installation', async () => {
    const error = new Error('installation failed');
    putComponentTemplate.mockRejectedValueOnce(error).mockResolvedValueOnce({});

    await expect(ensureAgentMemoryMappingsComponentTemplate({ esClient, logger })).rejects.toThrow(
      error
    );
    await expect(
      ensureAgentMemoryMappingsComponentTemplate({ esClient, logger })
    ).resolves.toBeUndefined();

    expect(putComponentTemplate).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to install component template`)
    );
  });
});
