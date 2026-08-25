/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { resolveEsqlDataset } from './resolve_esql_dataset';

const createEsClient = (fieldCaps: jest.Mock): IScopedClusterClient =>
  ({ asCurrentUser: { fieldCaps } } as unknown as IScopedClusterClient);

describe('resolveEsqlDataset', () => {
  it('uses the time field referenced by the query', async () => {
    const fieldCaps = jest.fn();
    const esClient = createEsClient(fieldCaps);

    await expect(
      resolveEsqlDataset(
        esClient,
        'FROM logs-* | WHERE event.created >= ?_tstart AND event.created <= ?_tend'
      )
    ).resolves.toEqual({ index: 'logs-*', timeField: 'event.created' });
    expect(fieldCaps).not.toHaveBeenCalled();
  });

  it('falls back to @timestamp when the source exposes it', async () => {
    const fieldCaps = jest.fn().mockResolvedValue({
      fields: { '@timestamp': { date: { type: 'date' } } },
    });
    const esClient = createEsClient(fieldCaps);

    await expect(
      resolveEsqlDataset(esClient, 'FROM logs-* | STATS count = COUNT(*)', '_alias:logs')
    ).resolves.toEqual({ index: 'logs-*', timeField: '@timestamp' });
    expect(fieldCaps).toHaveBeenCalledWith({
      index: 'logs-*',
      fields: '@timestamp',
      include_unmapped: false,
      project_routing: '_alias:logs',
    });
  });

  it('treats a source without a time field as time-independent', async () => {
    const fieldCaps = jest.fn().mockResolvedValue({ fields: {} });
    const esClient = createEsClient(fieldCaps);

    await expect(
      resolveEsqlDataset(esClient, 'FROM lookup-data | KEEP id, name')
    ).resolves.toBeUndefined();
  });
});
