/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { ESQLViewInitializer } from './esql_view_initializer';

const createMockEsClient = (transportRequestMock: jest.Mock) =>
  ({
    transport: { request: transportRequestMock },
  } as unknown as ElasticsearchClient);

describe('ESQLViewInitializer', () => {
  let esClient: ElasticsearchClient;
  let transportRequestMock: jest.Mock;
  const mockLogger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    transportRequestMock = jest.fn().mockResolvedValue(undefined);
    esClient = createMockEsClient(transportRequestMock);
  });

  it('creates the ESQL view via the transport API', async () => {
    const viewDefinition = { key: 'view:a', name: 'view-a', query: 'FROM a | LIMIT 1' };
    const initializer = new ESQLViewInitializer(mockLogger, esClient, viewDefinition);

    await initializer.initialize();

    expect(transportRequestMock).toHaveBeenCalledTimes(1);
    expect(transportRequestMock).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_query/view/view-a',
      body: { query: 'FROM a | LIMIT 1' },
    });
  });

  it('propagates errors from the transport API', async () => {
    const viewDefinition = {
      key: 'view:test-view',
      name: 'test-view',
      query: 'FROM index-* | LIMIT 10',
    };
    transportRequestMock.mockRejectedValueOnce(new Error('ES request failed'));

    const initializer = new ESQLViewInitializer(mockLogger, esClient, viewDefinition);

    await expect(initializer.initialize()).rejects.toThrow('ES request failed');
  });
});
