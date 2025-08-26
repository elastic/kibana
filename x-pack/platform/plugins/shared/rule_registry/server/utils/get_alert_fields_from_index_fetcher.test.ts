/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { getAlertFieldsFromIndexFetcher } from './get_alert_fields_from_index_fetcher';
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';

describe('getAlertFieldsFromIndexFetcher', () => {
  const requestHandlerContext = coreMock.createRequestHandlerContext();
  const esClientScopedMock = requestHandlerContext.elasticsearch.client.asCurrentUser;
  const indexPatternsFetcher = new IndexPatternsFetcher(esClientScopedMock);

  beforeEach(async () => {
    IndexPatternsFetcher.prototype.getFieldsForWildcard = jest.fn().mockResolvedValue({
      fields: [],
      indices: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch alert fields correctly', async () => {
    IndexPatternsFetcher.prototype.getFieldsForWildcard = jest.fn().mockResolvedValueOnce({
      fields: [
        { name: 'message', type: 'string' },
        { name: 'log.level', type: 'string' },
        { name: '@timestamp', type: 'date' },
        { name: 'event.category', type: 'string' },
        { name: 'signal.status', type: 'keyword' },
      ],
      indices: [
        '.alerts-stack.alerts-default',
        '.alerts-observability.logs.alerts-default',
        '.alerts-security.alerts-default',
      ],
    });

    const response = await getAlertFieldsFromIndexFetcher(indexPatternsFetcher, [
      '.alerts-stack.alerts-default',
      '.alerts-observability.logs.alerts-default',
      '.alerts-security.alerts-default',
    ]);

    expect(IndexPatternsFetcher.prototype.getFieldsForWildcard).toHaveBeenCalledTimes(1);

    expect(IndexPatternsFetcher.prototype.getFieldsForWildcard).toHaveBeenCalledWith({
      fieldCapsOptions: {
        allow_no_indices: true,
      },
      includeEmptyFields: false,
      indexFilter: {
        range: {
          '@timestamp': {
            gte: 'now-90d',
          },
        },
      },
      pattern: [
        '.alerts-stack.alerts-default',
        '.alerts-observability.logs.alerts-default',
        '.alerts-security.alerts-default',
      ],
      metaFields: ['_id', '_index'],
    });

    expect(response).toEqual([
      {
        name: 'message',
        type: 'string',
      },
      {
        name: 'log.level',
        type: 'string',
      },
      { name: '@timestamp', type: 'date' },
      { name: 'event.category', type: 'string' },
      { name: 'signal.status', type: 'keyword' },
    ]);
  });

  test('should not call getFieldsForWildcard when indices are empty', async () => {
    await getAlertFieldsFromIndexFetcher(indexPatternsFetcher, []);

    expect(IndexPatternsFetcher.prototype.getFieldsForWildcard).not.toHaveBeenCalled();
  });

  test('returns empty fields when not authorized', async () => {
    IndexPatternsFetcher.prototype.getFieldsForWildcard = jest
      .fn()
      .mockRejectedValueOnce({ meta: { statusCode: 403 }, message: 'Forbidden' });
    const response = await getAlertFieldsFromIndexFetcher(indexPatternsFetcher, [
      '.alerts-security.alerts-default',
    ]);
    expect(response).toHaveLength(0);
  });

  test('throws error correctly', async () => {
    IndexPatternsFetcher.prototype.getFieldsForWildcard = jest
      .fn()
      .mockRejectedValueOnce({ meta: { statusCode: 500 }, message: 'Something went wrong' });

    await expect(
      getAlertFieldsFromIndexFetcher(indexPatternsFetcher, ['.alerts-security.alerts-default'])
    ).rejects.toMatchObject({ meta: { statusCode: 500 }, message: 'Something went wrong' });
  });
});
