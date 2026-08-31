/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { AgentExecutionMode } from '@kbn/agent-builder-common';

const mockStorageClient = {
  index: jest.fn(),
};

jest.mock('./agent_execution_storage', () => ({
  ...jest.requireActual('./agent_execution_storage'),
  createStorage: () => ({ getClient: () => mockStorageClient }),
}));

import { createAgentExecutionClient } from './agent_execution_client';

describe('AgentExecutionClient', () => {
  const client = createAgentExecutionClient({
    logger: loggerMock.create(),
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
  });

  const createParams = {
    executionId: 'exec-1',
    agentId: 'agent-1',
    spaceId: 'default',
    agentParams: { nextInput: { message: 'hello' } },
    executionMode: AgentExecutionMode.conversation,
  } as const;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageClient.index.mockResolvedValue({});
  });

  describe('create', () => {
    it('indexes the document with an atomic create', async () => {
      await client.create(createParams);

      expect(mockStorageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'exec-1', op_type: 'create' })
      );
    });

    it('propagates document conflicts to the caller', async () => {
      const conflict = Object.assign(new Error('version conflict'), {
        meta: { statusCode: 409 },
      });
      mockStorageClient.index.mockRejectedValueOnce(conflict);

      await expect(client.create(createParams)).rejects.toBe(conflict);
    });
  });
});
