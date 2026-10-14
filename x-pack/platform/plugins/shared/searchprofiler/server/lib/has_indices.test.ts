/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { hasIndices } from './has_indices';

describe('hasIndices', () => {
  const log = loggingSystemMock.create().get();
  let client: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    client = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('returns true when local indices exist, without checking remote indices', async () => {
    client.indices.exists.mockResolvedValueOnce(true);

    await expect(hasIndices(client, log)).resolves.toBe(true);

    expect(client.indices.exists).toHaveBeenCalledTimes(1);
    expect(client.indices.exists).toHaveBeenCalledWith({ index: '*' });
  });

  it('falls back to remote indices when there are no local indices', async () => {
    client.indices.exists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await expect(hasIndices(client, log)).resolves.toBe(true);

    expect(client.indices.exists).toHaveBeenCalledTimes(2);
    expect(client.indices.exists).toHaveBeenNthCalledWith(1, { index: '*' });
    expect(client.indices.exists).toHaveBeenNthCalledWith(2, { index: '*:*' });
  });

  it('returns false when neither local nor remote indices exist', async () => {
    client.indices.exists.mockResolvedValueOnce(false).mockResolvedValueOnce(false);

    await expect(hasIndices(client, log)).resolves.toBe(false);
  });

  it('returns false and does not throw when the remote-cluster check errors', async () => {
    client.indices.exists
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error('failed to resolve *:*'));

    await expect(hasIndices(client, log)).resolves.toBe(false);

    expect(log.debug).toHaveBeenCalledWith(
      expect.stringContaining('Search Profiler remote index check failed')
    );
  });
});
