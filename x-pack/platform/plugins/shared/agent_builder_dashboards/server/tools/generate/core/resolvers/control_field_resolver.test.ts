/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexFields } from '@kbn/agent-builder-genai-utils';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createControlFieldResolver } from './control_field_resolver';

jest.mock('@kbn/agent-builder-genai-utils');

const getIndexFieldsMock = getIndexFields as jest.MockedFunction<typeof getIndexFields>;

const sampleLogsFields = {
  type: 'index' as const,
  fields: [
    { path: 'host', type: 'text', meta: {} },
    { path: 'host.keyword', type: 'keyword', meta: {} },
  ],
};

describe('createControlFieldResolver', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();

  beforeEach(() => {
    getIndexFieldsMock.mockReset();
  });

  it('rewrites a text field to its keyword sibling', async () => {
    getIndexFieldsMock.mockResolvedValue({
      kibana_sample_data_logs: sampleLogsFields,
    });

    const resolve = createControlFieldResolver({ esClient, logger });

    await expect(resolve({ fieldName: 'host', index: 'kibana_sample_data_logs' })).resolves.toEqual(
      {
        fieldName: 'host.keyword',
      }
    );
  });

  it('rejects an unknown field', async () => {
    getIndexFieldsMock.mockResolvedValue({
      kibana_sample_data_logs: sampleLogsFields,
    });

    const resolve = createControlFieldResolver({ esClient, logger });

    await expect(
      resolve({ fieldName: 'method', index: 'kibana_sample_data_logs' })
    ).resolves.toEqual({
      error: 'Field "method" is not an aggregatable field on this index.',
    });
  });

  it('fetches once for multiple fields on the same index', async () => {
    getIndexFieldsMock.mockResolvedValue({
      kibana_sample_data_logs: sampleLogsFields,
    });

    const resolve = createControlFieldResolver({ esClient, logger });

    await resolve({ fieldName: 'host', index: 'kibana_sample_data_logs' });
    await resolve({ fieldName: 'method', index: 'kibana_sample_data_logs' });

    expect(getIndexFieldsMock).toHaveBeenCalledTimes(1);
    expect(getIndexFieldsMock).toHaveBeenCalledWith({
      indices: ['kibana_sample_data_logs'],
      esClient,
    });
  });

  it('returns an error when the mapping fetch fails', async () => {
    getIndexFieldsMock.mockRejectedValue(new Error('index_not_found_exception'));

    const resolve = createControlFieldResolver({ esClient, logger });

    await expect(resolve({ fieldName: 'host', index: 'missing-*' })).resolves.toEqual({
      error: 'Could not load mapping for index "missing-*": index_not_found_exception',
    });
  });
});
