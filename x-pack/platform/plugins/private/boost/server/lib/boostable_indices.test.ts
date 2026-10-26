/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { markBoostableIndices } from './boostable_indices';

describe('markBoostableIndices', () => {
  it("marks system indices as ones search boost doesn't apply to", async () => {
    const client = elasticsearchServiceMock.createScopedClusterClient();
    client.asCurrentUser.indices.resolveIndex.mockResolvedValue({
      indices: [
        { name: 'products', attributes: ['open'] },
        { name: '.ds-logs-app-000001', attributes: ['open', 'hidden'], data_stream: 'logs-app' },
        { name: '.kibana_1', attributes: ['open', 'hidden', 'system'] },
      ],
      aliases: [],
      data_streams: [],
    });

    const indices = await markBoostableIndices(
      [{ name: 'products' }, { name: '.ds-logs-app-000001' }, { name: '.kibana_1' }],
      client
    );

    expect(indices.map(({ name, isBoostable }) => [name, isBoostable])).toEqual([
      ['products', true],
      ['.ds-logs-app-000001', true],
      ['.kibana_1', false],
    ]);
  });
});
