/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ACTIVITY_INDEX_NAME } from '../constants';
import { ACTIVITY_INDEX_MAPPING } from '../mappings/activity';
import { ensureActivityIndex } from './activity';

const buildDeps = () => ({
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  logger: loggerMock.create(),
});

describe('ensureActivityIndex', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates the index without lookup mode when it does not exist', async () => {
    const { esClient, logger } = buildDeps();
    (esClient.indices.exists as unknown as jest.Mock).mockResolvedValue(false);
    (esClient.indices.create as unknown as jest.Mock).mockResolvedValue({});

    await ensureActivityIndex({ esClient, logger });

    const call = (esClient.indices.create as unknown as jest.Mock).mock.calls[0][0];
    expect(call.index).toBe(ACTIVITY_INDEX_NAME);
    expect(call.mappings).toBe(ACTIVITY_INDEX_MAPPING);
    expect(call.settings).toEqual({
      'index.hidden': true,
      'index.auto_expand_replicas': '0-1',
    });
  });

  it('syncs the activity mapping when the index already exists', async () => {
    const { esClient, logger } = buildDeps();
    (esClient.indices.exists as unknown as jest.Mock).mockResolvedValue(true);
    (esClient.indices.putMapping as unknown as jest.Mock).mockResolvedValue({});

    await ensureActivityIndex({ esClient, logger });

    expect(esClient.indices.create).not.toHaveBeenCalled();
    const call = (esClient.indices.putMapping as unknown as jest.Mock).mock.calls[0][0];
    expect(call.index).toBe(ACTIVITY_INDEX_NAME);
    expect(call.properties).toEqual(ACTIVITY_INDEX_MAPPING.properties);
  });
});
