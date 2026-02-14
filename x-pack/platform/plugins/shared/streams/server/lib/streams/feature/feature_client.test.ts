/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IStorageClient } from '@kbn/storage-adapter';

import { FeatureClient } from './feature_client';
import { FEATURE_EXPIRES_AT, STREAM_NAME } from './fields';
import type { FeatureStorageSettings } from './storage_settings';
import type { StoredFeature } from './stored_feature';

describe('FeatureClient', () => {
  const createStorageClientMock = () => {
    const storageClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' as const },
        },
      }),
    } as unknown as IStorageClient<FeatureStorageSettings, StoredFeature>;

    return storageClient;
  };

  describe('getAllFeatures', () => {
    it('returns empty without searching when streams is empty', async () => {
      const storageClient = createStorageClientMock();
      const client = new FeatureClient({ storageClient });

      await expect(client.getAllFeatures([])).resolves.toEqual({ hits: [], total: 0 });
      expect(storageClient.search).not.toHaveBeenCalled();
    });

    it('adds expiry filtering mirroring getFeatures', async () => {
      const storageClient = createStorageClientMock();
      const client = new FeatureClient({ storageClient });

      const now = 1710000000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      await client.getAllFeatures(['stream-a', 'stream-b']);

      expect(storageClient.search).toHaveBeenCalledTimes(1);
      const [searchParams] = (storageClient.search as jest.Mock).mock.calls[0];

      expect(searchParams).toEqual(
        expect.objectContaining({
          query: {
            bool: {
              filter: expect.arrayContaining([
                { terms: { [STREAM_NAME]: ['stream-a', 'stream-b'] } },
                {
                  bool: {
                    should: expect.arrayContaining([
                      { bool: { must_not: { exists: { field: FEATURE_EXPIRES_AT } } } },
                      {
                        range: {
                          [FEATURE_EXPIRES_AT]: {
                            gte: now,
                            lte: undefined,
                            format: 'epoch_millis',
                          },
                        },
                      },
                    ]),
                    minimum_should_match: 1,
                  },
                },
              ]),
            },
          },
        })
      );
    });
  });
});
