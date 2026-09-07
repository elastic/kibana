/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { ElasticsearchAssetType, type InstallablePackage } from '../../../../../common';
import { createArchiveIteratorFromMap } from '../../archive/archive_iterator';
import { updateEsAssetReferences } from '../../packages/es_assets_reference';

import { installIndexAliases } from './install';

jest.mock('../../packages/es_assets_reference');

async function createPackageInstallContext() {
  const archiveIterator = createArchiveIteratorFromMap(
    new Map([
      [
        'test-package-1.0.0/elasticsearch/index_alias/alias1.json',
        Buffer.from(
          JSON.stringify({
            alias: 'alias1',
            indices: ['index1'],
          })
        ),
      ],
      [
        'test-package-1.0.0/elasticsearch/index_alias/alias2.yml',
        Buffer.from(`alias: alias2\nindices:\n  - index2\n  - index3`),
      ],
      ['test-package-1.0.0/elasticsearch/transform/test.yml', Buffer.from(`test: transform`)],
      ['test-package-1.0.0/kibana/dashboard/test.yml', Buffer.from(`test: dashboard`)],
    ])
  );
  return {
    archiveIterator,
    paths: await archiveIterator.getPaths(),
    packageInfo: {
      name: 'test-package',
      version: '1.0.0',
    } as unknown as InstallablePackage,
  };
}

describe('installIndexAliases', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .mocked(updateEsAssetReferences)
      .mockImplementation(async (_, __, currentAssets, { assetsToAdd }) => {
        return [...currentAssets, ...(assetsToAdd ?? [])];
      });
  });

  it('should install index aliases', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const savedObjectsClient = savedObjectsClientMock.create();

    const esReferences = await installIndexAliases({
      packageInstallContext: await createPackageInstallContext(),
      esClient,
      logger,
      savedObjectsClient,
      esReferences: [
        {
          id: 'existing_transform',
          type: ElasticsearchAssetType.transform,
        },
      ],
    });

    expect(esClient.indices.putAlias).toHaveBeenCalledTimes(3);
    expect(esClient.indices.putAlias).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'index1',
        name: 'alias1',
      })
    );
    expect(esClient.indices.putAlias).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'index2',
        name: 'alias2',
      })
    );
    expect(esClient.indices.putAlias).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'index3',
        name: 'alias2',
      })
    );

    expect(esReferences).toEqual([
      expect.objectContaining({ id: 'existing_transform', type: 'transform' }),
      expect.objectContaining({ id: 'alias1', type: 'index_alias' }),
      expect.objectContaining({ id: 'alias2', type: 'index_alias' }),
    ]);

    expect(updateEsAssetReferences).toHaveBeenCalledWith(
      expect.anything(),
      'test-package',
      expect.anything(),
      {
        assetsToAdd: [
          { id: 'alias1', type: ElasticsearchAssetType.indexAlias },
          { id: 'alias2', type: ElasticsearchAssetType.indexAlias },
        ],
      }
    );
  });
});
