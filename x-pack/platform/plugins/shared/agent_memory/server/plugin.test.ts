/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import type { AgentMemoryConfig } from './config';
import { AgentMemoryPlugin } from './plugin';
import type { AgentMemoryStartDependencies, GetMemoryStorage } from './types';

jest.mock('./storage/memory_storage', () => ({
  createMemoryStorage: jest.fn().mockReturnValue({}),
}));

jest.mock('@kbn/data-streams', () => ({
  DataStreamClient: {
    fromDefinition: jest.fn().mockReturnValue({}),
    initializeTemplate: jest.fn().mockResolvedValue(undefined),
  },
}));

const { createMemoryStorage } = jest.requireMock('./storage/memory_storage') as {
  createMemoryStorage: jest.Mock;
};

describe('AgentMemoryPlugin', () => {
  it('uses the request client for data and the internal client for index templates', async () => {
    const initializerContext = coreMock.createPluginInitializerContext<AgentMemoryConfig>();
    initializerContext.config.get.mockReturnValue({ enabled: true });
    const plugin = new AgentMemoryPlugin(initializerContext);
    const coreStart = coreMock.createStart();
    const internalEsClient = coreStart.elasticsearch.client.asInternalUser;

    await plugin.start(coreStart, {
      security: {},
    } as AgentMemoryStartDependencies);

    const { createStorage } = plugin as unknown as {
      createStorage: GetMemoryStorage;
    };
    const currentUserEsClient = {} as ElasticsearchClient;
    createStorage(currentUserEsClient);

    expect(createMemoryStorage).toHaveBeenCalledWith({
      logger: expect.anything(),
      esClient: currentUserEsClient,
      indexManagementClient: internalEsClient,
    });
  });
});
