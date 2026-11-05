/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createHasField } from './has_field';

describe('createHasField', () => {
  it('asks field caps for the field, as Kibana resolves an ES|QL time field', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    client.fieldCaps.mockResolvedValue({
      indices: ['logs'],
      fields: { '@timestamp': { date: { type: 'date', searchable: true, aggregatable: true } } },
    });
    expect(await createHasField(client)('logs-*', '@timestamp')).toBe(true);
    expect(client.fieldCaps).toHaveBeenCalledWith({
      index: 'logs-*',
      fields: '@timestamp',
      include_unmapped: false,
    });
  });

  it('is false for an unmapped field or a failed request', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    client.fieldCaps.mockResolvedValueOnce({ indices: ['logs'], fields: {} });
    expect(await createHasField(client)('logs', '@timestamp')).toBe(false);
    client.fieldCaps.mockRejectedValueOnce(new Error('index_not_found_exception'));
    expect(await createHasField(client)('nope', '@timestamp')).toBe(false);
  });
});
