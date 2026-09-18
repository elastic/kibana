/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { AgentExecutionMode, ExecutionStatus } from '@kbn/agent-builder-common';

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

  describe('updateStatus', () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const statusClient = createAgentExecutionClient({ logger: loggerMock.create(), esClient });

    it('writes the status and the error through a script that keeps aborted sticky', async () => {
      await statusClient.updateStatus('exec-1', ExecutionStatus.failed, {
        error: { code: 'internalError', message: 'boom' } as never,
      });

      expect(esClient.update).toHaveBeenCalledTimes(1);
      const [request] = esClient.update.mock.calls[0];
      expect(request).toMatchObject({ id: 'exec-1' });
      const script = (request as { script: { source: string; params: Record<string, unknown> } })
        .script;
      expect(script.params).toEqual({
        status: ExecutionStatus.failed,
        error: { code: 'internalError', message: 'boom' },
        abort_reason: null,
      });
      expect(script.source).toContain('if (params.abort_reason != null)');
      // aborted must survive both a later `failed` and a later `completed`
      expect(script.source).toContain("ctx._source.status == 'aborted'");
      expect(script.source).toContain("params.status == 'failed'");
      expect(script.source).toContain("params.status == 'completed'");
      expect(script.source).toContain('if (params.error != null)');
    });

    it('passes a null error when none is given', async () => {
      await statusClient.updateStatus('exec-1', ExecutionStatus.running);

      const [request] = esClient.update.mock.calls[0];
      expect((request as { script: { params: unknown } }).script.params).toEqual({
        status: ExecutionStatus.running,
        error: null,
        abort_reason: null,
      });
    });

    it('records the abort reason when given', async () => {
      const abortReason = { source: 'api' as const, actor: { id: 'u1', username: 'alice' } };
      await statusClient.updateStatus('exec-1', ExecutionStatus.aborted, { abortReason });

      const [request] = esClient.update.mock.calls[0];
      expect((request as { script: { params: unknown } }).script.params).toEqual({
        status: ExecutionStatus.aborted,
        error: null,
        abort_reason: abortReason,
      });
    });
  });
});
