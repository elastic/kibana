/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { CASE_INDEX_NAME } from '../constants';
import { CASE_INDEX_MAPPING } from '../mappings/case';
import { ensureCaseIndex } from './case';

const buildDeps = () => ({
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  logger: loggerMock.create(),
});

describe('ensureCaseIndex', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates the index as a lookup index when it does not exist', async () => {
    const { esClient, logger } = buildDeps();
    (esClient.indices.exists as unknown as jest.Mock).mockResolvedValue(false);
    (esClient.indices.create as unknown as jest.Mock).mockResolvedValue({});

    await ensureCaseIndex({ esClient, logger });

    const call = (esClient.indices.create as unknown as jest.Mock).mock.calls[0][0];
    expect(call.index).toBe(CASE_INDEX_NAME);
    expect(call.mappings).toBe(CASE_INDEX_MAPPING);
    expect(call.settings).toEqual({
      'index.hidden': true,
      'index.mode': 'lookup',
      'index.auto_expand_replicas': '0-1',
    });
  });

  it('syncs properties and dynamic templates when the index already exists', async () => {
    const { esClient, logger } = buildDeps();
    (esClient.indices.exists as unknown as jest.Mock).mockResolvedValue(true);
    (esClient.indices.putMapping as unknown as jest.Mock).mockResolvedValue({});

    await ensureCaseIndex({ esClient, logger });

    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: CASE_INDEX_NAME,
      properties: CASE_INDEX_MAPPING.properties,
      dynamic_templates: CASE_INDEX_MAPPING.dynamic_templates,
    });
  });
});
