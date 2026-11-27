/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createDataStream, putIndexTemplate } from '../../infra/elasticsearch';
import {
  ensureResolutionRunsDataStream,
  getResolutionRunsDataStreamName,
  getResolutionRunsIndexTemplateConfig,
  RESOLUTION_RUNS_RETENTION,
} from './resolution_runs_data_stream';

jest.mock('../../infra/elasticsearch', () => ({
  createDataStream: jest.fn(),
  putIndexTemplate: jest.fn(),
}));

describe('resolution runs data stream', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is named under the entity store prefix that existing roles cover', () => {
    expect(getResolutionRunsDataStreamName('default')).toBe('.entities.v2.resolution_runs.default');
  });

  it('keeps records for 30 days in a data stream', () => {
    const config = getResolutionRunsIndexTemplateConfig('default');

    expect(RESOLUTION_RUNS_RETENTION).toBe('30d');
    expect(config.template?.lifecycle?.data_retention).toBe('30d');
    expect(config.data_stream).toEqual({});
    expect(config.index_patterns).toEqual(['.entities.v2.resolution_runs.default']);
  });

  it('maps the fields the dashboard needs', () => {
    const properties = getResolutionRunsIndexTemplateConfig('default').template?.mappings
      ?.properties as Record<string, unknown>;

    expect(Object.keys(properties)).toEqual(
      expect.arrayContaining(['@timestamp', 'rule', 'event', 'error', 'resolution'])
    );
  });

  it('creates the template before the data stream, and is safe to repeat', async () => {
    const order: string[] = [];
    (putIndexTemplate as jest.Mock).mockImplementation(async () => order.push('template'));
    (createDataStream as jest.Mock).mockImplementation(async () => order.push('stream'));
    const esClient = {} as ElasticsearchClient;

    await ensureResolutionRunsDataStream(esClient, 'default', loggerMock.create());
    await ensureResolutionRunsDataStream(esClient, 'default', loggerMock.create());

    expect(order).toEqual(['template', 'stream', 'template', 'stream']);
    expect(createDataStream).toHaveBeenCalledWith(
      esClient,
      '.entities.v2.resolution_runs.default',
      { throwIfExists: false }
    );
  });
});
