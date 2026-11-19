/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runEsqlCategorizeRequest } from './run_esql_categorize_request';

describe('runEsqlCategorizeRequest', () => {
  it('buckets the sparklines in UTC so they align with the document count histogram', async () => {
    const esql = jest.fn().mockResolvedValue({
      rawResponse: {
        columns: [
          { name: 'Pattern', type: 'keyword' },
          { name: 'Count', type: 'long' },
        ],
        values: [['error *', 3]],
      },
    });
    const signal = new AbortController().signal;

    const { categories } = await runEsqlCategorizeRequest({
      esql: 'FROM logs-*',
      fieldName: 'message',
      timeFieldName: '@timestamp',
      earliest: Date.parse('2024-01-01T10:00:00.000Z'),
      latest: Date.parse('2024-01-01T12:00:00.000Z'),
      intervalMs: 60 * 60 * 1000,
      search: { esql },
      signal,
    });

    expect(esql).toHaveBeenCalledTimes(1);
    expect(esql).toHaveBeenCalledWith(
      expect.objectContaining({ timeZone: 'UTC' }),
      expect.objectContaining({ abortSignal: signal })
    );
    expect(categories).toHaveLength(1);
    expect(categories[0].count).toBe(3);
  });
});
