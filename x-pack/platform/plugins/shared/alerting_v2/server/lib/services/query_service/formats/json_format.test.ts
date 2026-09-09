/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import { NON_STREAMING_MAX_ROWS } from '../../../../config';
import { createMockEsClient } from '../../../test_utils';
import { jsonFormat } from './json_format';
import { collectBatches } from './test_utils';

describe('jsonFormat', () => {
  let mockEsClient: DeeplyMockedApi<ElasticsearchClient>;
  const request = { query: 'FROM logs-*', drop_null_columns: true } as const;
  const options = { signal: new AbortController().signal };

  beforeEach(() => {
    mockEsClient = createMockEsClient();
  });

  it('is named json and caps itself at NON_STREAMING_MAX_ROWS', () => {
    expect(jsonFormat.name).toBe('json');
    expect(jsonFormat.maxRows).toBe(NON_STREAMING_MAX_ROWS);
    expect(NON_STREAMING_MAX_ROWS).toBe(1000);
  });

  it('forwards the request and transport options verbatim to esql.query', async () => {
    mockEsClient.esql.query.mockResolvedValue({ columns: [], values: [] });

    const source = await jsonFormat.open(mockEsClient, request, options);
    await collectBatches(source.batches);

    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
    expect(mockEsClient.esql.query).toHaveBeenCalledWith(request, options);
    expect(mockEsClient.helpers.esql).not.toHaveBeenCalled();
  });

  it('yields the whole result set as a single batch', async () => {
    mockEsClient.esql.query.mockResolvedValue({
      columns: [
        { name: 'host', type: 'keyword' },
        { name: 'count', type: 'integer' },
      ],
      values: [
        ['host-a', 1],
        ['host-b', 2],
      ],
    });

    const source = await jsonFormat.open(mockEsClient, request, options);

    expect(await collectBatches(source.batches)).toEqual([
      [
        { host: 'host-a', count: 1 },
        { host: 'host-b', count: 2 },
      ],
    ]);
  });

  it('normalizes date columns to epoch millis so it matches the arrow format', async () => {
    const iso = '2026-08-24T14:01:32.000Z';
    mockEsClient.esql.query.mockResolvedValue({
      columns: [{ name: 'bucket', type: 'date' }],
      values: [[iso]],
    });

    const source = await jsonFormat.open(mockEsClient, request, options);

    expect(await collectBatches(source.batches)).toEqual([[{ bucket: Date.parse(iso) }]]);
  });

  it('yields one empty batch when the result set is empty', async () => {
    mockEsClient.esql.query.mockResolvedValue({
      columns: [{ name: 'host', type: 'keyword' }],
      values: [],
    });

    const source = await jsonFormat.open(mockEsClient, request, options);

    expect(await collectBatches(source.batches)).toEqual([[]]);
  });

  it('does not expose a close hook, since it holds no resources', async () => {
    mockEsClient.esql.query.mockResolvedValue({ columns: [], values: [] });

    const source = await jsonFormat.open(mockEsClient, request, options);

    expect(source.close).toBeUndefined();
  });
});
