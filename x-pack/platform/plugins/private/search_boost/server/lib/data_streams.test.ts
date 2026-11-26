/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getDataStreams } from './data_streams';

const forbidden = () =>
  new errors.ResponseError({
    statusCode: 403,
    body: { error: { type: 'security_exception' } },
    headers: {},
    warnings: [],
    meta: {} as DiagnosticResult['meta'],
  });

describe('getDataStreams', () => {
  it('lists the data streams, hidden ones included', async () => {
    const client = elasticsearchServiceMock.createScopedClusterClient();
    const logs = { name: 'logs' } as IndicesDataStream;
    client.asCurrentUser.indices.getDataStream.mockResolvedValue({ data_streams: [logs] });

    expect(await getDataStreams(client)).toEqual([logs]);
    expect(client.asCurrentUser.indices.getDataStream).toHaveBeenCalledWith({
      name: '*',
      expand_wildcards: ['open', 'hidden'],
    });
  });

  it('lists none without the privileges to read them', async () => {
    const client = elasticsearchServiceMock.createScopedClusterClient();
    client.asCurrentUser.indices.getDataStream.mockRejectedValue(forbidden());

    expect(await getDataStreams(client)).toEqual([]);
  });

  it('fails on other errors', async () => {
    const client = elasticsearchServiceMock.createScopedClusterClient();
    client.asCurrentUser.indices.getDataStream.mockRejectedValue(new Error('Unavailable'));

    await expect(getDataStreams(client)).rejects.toThrow('Unavailable');
  });
});
