/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { ESQLViewInitializer } from './esql_view_initializer';

const flushPromises = () => new Promise(setImmediate);
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

  it('initializes views as expected', async () => {
    const viewDefinitions = [
      { key: 'view:a', name: 'view-a', query: 'FROM a | LIMIT 1' },
      { key: 'view:b', name: 'view-b', query: 'FROM b | LIMIT 2' },
    ];
    const initializer = new ESQLViewInitializer(mockLogger, esClient);

    initializer.startInitialization({ viewDefinitions });

    await flushPromises();

    expect(transportRequestMock).toHaveBeenCalledTimes(2);
    expect(transportRequestMock).toHaveBeenNthCalledWith(1, {
      method: 'PUT',
      path: '/_query/view/view-a',
      body: { query: 'FROM a | LIMIT 1' },
    });
    expect(transportRequestMock).toHaveBeenNthCalledWith(2, {
      method: 'PUT',
      path: '/_query/view/view-b',
      body: { query: 'FROM b | LIMIT 2' },
    });
  });

  it('catches errors and logs when initialization fails', async () => {
    const viewDefinition = {
      key: 'view:test-view',
      name: 'test-view',
      query: 'FROM index-* | LIMIT 10',
    };
    const error = new Error('ES request failed');
    transportRequestMock.mockRejectedValueOnce(error);

    const initializer = new ESQLViewInitializer(mockLogger, esClient);

    initializer.startInitialization({ viewDefinitions: [viewDefinition] });

    await flushPromises();

    expect(transportRequestMock).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `EsqlViewInitializer: Initialization for view [${viewDefinition.key}] failed. Error: ${error.message}`
    );
  });
});
