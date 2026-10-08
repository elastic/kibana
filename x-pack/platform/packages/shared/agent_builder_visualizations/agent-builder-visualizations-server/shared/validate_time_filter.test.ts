/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { findMissingTimeFilterError } from './validate_time_filter';

const createEsClient = (fieldCaps: jest.Mock) => ({ fieldCaps } as unknown as ElasticsearchClient);

const mockDateFields = (fieldNames: string[]) =>
  createEsClient(
    jest.fn().mockResolvedValue({
      fields: Object.fromEntries(fieldNames.map((name) => [name, { date: { type: 'date' } }])),
    })
  );

describe('findMissingTimeFilterError', () => {
  it('accepts a query that uses the time-picker params without checking the source', async () => {
    const esClient = mockDateFields(['order_date']);

    await expect(
      findMissingTimeFilterError(
        esClient,
        'FROM orders | WHERE order_date >= ?_tstart AND order_date < ?_tend | STATS count = COUNT()'
      )
    ).resolves.toBeUndefined();
    expect(esClient.fieldCaps).not.toHaveBeenCalled();
  });

  it('accepts a source with @timestamp, which Kibana filters on its own', async () => {
    const esClient = mockDateFields(['@timestamp', 'event.created']);

    await expect(
      findMissingTimeFilterError(esClient, 'FROM logs | STATS count = COUNT()')
    ).resolves.toBeUndefined();
  });

  it('accepts a source without date fields', async () => {
    const esClient = mockDateFields([]);

    await expect(
      findMissingTimeFilterError(esClient, 'FROM products | STATS count = COUNT()')
    ).resolves.toBeUndefined();
  });

  it('rejects a query without time params on a source whose dates are not @timestamp', async () => {
    const esClient = mockDateFields(['order_date', 'shipped_at']);

    const error = await findMissingTimeFilterError(esClient, 'FROM orders | STATS count = COUNT()');

    expect(error).toContain('"orders" has no @timestamp field');
    expect(error).toContain('one of: order_date, shipped_at');
  });

  it('skips the check when the source cannot be inspected', async () => {
    const esClient = createEsClient(
      jest.fn().mockRejectedValue(new Error('index_not_found_exception'))
    );

    await expect(
      findMissingTimeFilterError(esClient, 'FROM orders | STATS count = COUNT()')
    ).resolves.toBeUndefined();
  });
});
