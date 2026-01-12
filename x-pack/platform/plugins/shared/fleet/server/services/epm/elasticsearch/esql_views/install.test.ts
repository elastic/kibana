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

import { installEsqlViews } from './install';

jest.mock('../../packages/es_assets_reference');

async function createPackageInstallContext() {
  const archiveIterator = createArchiveIteratorFromMap(
    new Map([
      [
        'test-package-1.0.0/elasticsearch/esql_view/view1.json',
        Buffer.from(
          JSON.stringify({
            name: 'view1',
            query: `FROM sample_data
| SORT @timestamp DESC
| LIMIT 3`,
          })
        ),
      ],
      [
        'test-package-1.0.0/elasticsearch/esql_view/view2.yml',
        Buffer.from(`name: view2\nquery: FROM sample_data | STATS count() BY category`),
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

describe('installEsqlViews', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .mocked(updateEsAssetReferences)
      .mockImplementation(async (_, __, currentAssets, { assetsToAdd }) => {
        return [...currentAssets, ...(assetsToAdd ?? [])];
      });
  });

  it('should install esql views', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const savedObjectsClient = savedObjectsClientMock.create();

    const esReferences = await installEsqlViews({
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

    expect(esClient.transport.request).toHaveBeenCalledTimes(2);
    expect(esClient.transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PUT',
        path: '/_query/view/view1',
      })
    );
    expect(esClient.transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PUT',
        path: '/_query/view/view2',
      })
    );

    expect(esReferences).toEqual([
      expect.objectContaining({ id: 'existing_transform', type: 'transform' }),
      expect.objectContaining({ id: 'view1', type: 'esql_view' }),
      expect.objectContaining({ id: 'view2', type: 'esql_view' }),
    ]);

    expect(updateEsAssetReferences).toHaveBeenCalledWith(
      expect.anything(),
      'test-package',
      expect.anything(),
      {
        assetsToAdd: [
          { id: 'view1', type: ElasticsearchAssetType.esqlView },
          { id: 'view2', type: ElasticsearchAssetType.esqlView },
        ],
      }
    );
  });
});
