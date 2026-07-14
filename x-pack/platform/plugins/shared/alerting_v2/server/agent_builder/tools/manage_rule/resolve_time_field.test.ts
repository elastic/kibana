/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { resolveTimeFieldForQuery } from './resolve_time_field';

const createEsClient = () => elasticsearchServiceMock.createScopedClusterClient();

describe('resolveTimeFieldForQuery', () => {
  it('resolves a non-@timestamp date field from the source index (rna-program#613)', async () => {
    const esClient = createEsClient();
    esClient.asCurrentUser.fieldCaps.mockResolvedValueOnce({
      indices: ['kibana_sample_data_flights'],
      fields: { timestamp: { date: {} } },
    } as never);

    const resolved = await resolveTimeFieldForQuery(
      esClient,
      'FROM kibana_sample_data_flights | STATS COUNT(*)',
      '@timestamp'
    );

    expect(resolved).toBe('timestamp');
    expect(esClient.asCurrentUser.fieldCaps).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'kibana_sample_data_flights',
        types: ['date', 'date_nanos'],
      })
    );
  });

  it('prefers @timestamp when the index has it', async () => {
    const esClient = createEsClient();
    esClient.asCurrentUser.fieldCaps.mockResolvedValueOnce({
      fields: { '@timestamp': { date: {} }, 'event.created': { date: {} } },
    } as never);

    const resolved = await resolveTimeFieldForQuery(esClient, 'FROM logs-*', undefined);

    expect(resolved).toBe('@timestamp');
  });

  it('returns undefined when the index has no date fields', async () => {
    const esClient = createEsClient();
    esClient.asCurrentUser.fieldCaps.mockResolvedValueOnce({ fields: {} } as never);

    const resolved = await resolveTimeFieldForQuery(esClient, 'FROM logs-*', undefined);

    expect(resolved).toBeUndefined();
  });

  it('returns undefined when no index can be parsed from the query', async () => {
    const esClient = createEsClient();

    const resolved = await resolveTimeFieldForQuery(esClient, 'ROW x = 1', undefined);

    expect(resolved).toBeUndefined();
    expect(esClient.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
  });

  it('returns undefined (best-effort) when the field caps lookup fails', async () => {
    const esClient = createEsClient();
    esClient.asCurrentUser.fieldCaps.mockRejectedValueOnce(new Error('boom'));

    const resolved = await resolveTimeFieldForQuery(esClient, 'FROM logs-*', 'timestamp');

    expect(resolved).toBeUndefined();
  });
});
