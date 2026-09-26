/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { PinnedVersionsClient } from './pinned_versions';
import { findPinnedSpecVersions } from './pinned_versions';

describe('findPinnedSpecVersions', () => {
  it('aggregates pinned versions per connector type across all spaces', async () => {
    const find = jest.fn().mockResolvedValue({
      saved_objects: [],
      total: 3,
      per_page: 0,
      page: 1,
      aggregations: {
        types: {
          buckets: [
            {
              key: '.abuseipdb',
              versions: { buckets: [{ key: '1.0' }, { key: '1.1' }] },
            },
            { key: '.okta', versions: { buckets: [{ key: '1.0' }] } },
            { key: '.slack', versions: { buckets: [] } },
          ],
        },
      },
    });
    const client = { find } as unknown as PinnedVersionsClient;

    const pinned = await findPinnedSpecVersions(client, loggerMock.create());

    expect([...pinned.entries()].map(([id, versions]) => [id, [...versions]])).toEqual([
      ['.abuseipdb', ['1.0', '1.1']],
      ['.okta', ['1.0']],
    ]);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'action',
        namespaces: ['*'],
        perPage: 0,
        filter: 'action.attributes.specVersion: *',
        aggs: expect.objectContaining({
          types: expect.objectContaining({
            terms: { field: 'action.attributes.actionTypeId', size: 1000 },
          }),
        }),
      })
    );
  });

  it('returns an empty map and warns when the query fails', async () => {
    const logger = loggerMock.create();
    const client = {
      find: jest.fn().mockRejectedValue(new Error('index_not_found_exception')),
    } as unknown as PinnedVersionsClient;

    await expect(findPinnedSpecVersions(client, logger)).resolves.toEqual(new Map());
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('index_not_found_exception'));
  });
});
