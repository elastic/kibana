/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createIndexAdapter } from './storage';

function createMockEsClient(): ElasticsearchClient {
  return {} as ElasticsearchClient;
}

describe('createIndexAdapter', () => {
  it('returns an adapter with getClient that exposes bulk, index, search, get, delete, clean, existsIndex', () => {
    const esClient = createMockEsClient();
    const logger = loggerMock.create();
    const adapter = createIndexAdapter({ logger, esClient });
    const client = adapter.getClient();

    expect(client.bulk).toBeDefined();
    expect(client.index).toBeDefined();
    expect(client.search).toBeDefined();
    expect(client.get).toBeDefined();
    expect(client.delete).toBeDefined();
    expect(client.clean).toBeDefined();
    expect(client.existsIndex).toBeDefined();
  });
});
