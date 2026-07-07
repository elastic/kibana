/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { getAsset, getEsPackage } from './storage';
import { appContextService } from '../../app_context';
import { createAppContextStartContractMock } from '../../../mocks';
import { filterAssetPathForParseAndVerifyArchive } from './parse';

describe('getAsset', () => {
  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
  });
  it('should not throw error if saved object not found', async () => {
    const soClientMock = {
      get: jest.fn().mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError()),
    } as any;
    const result = await getAsset({
      savedObjectsClient: soClientMock,
      path: 'path',
    });
    expect(result).toBeUndefined();
  });
});

describe('getEsPackage', () => {
  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
  });
  const PACKAGE_ASSETS: Array<[string, string]> = [
    ['test-1.0.0/LICENSE.txt', ''],
    ['test-1.0.0/changelog.yml', ''],
    ['test-1.0.0/manifest.yml', 'name: test\nversion: 1.0.0\ntitle: Test\nowner: Elastic\n'],
    ['test-1.0.0/docs/README.md', ''],
    ['test-1.0.0/data_stream/ds1/manifest.yml', 'type: logs\ntitle: DS1\n'],
    ['test-1.0.0/data_stream/ds1/elasticsearch/ingest_pipeline/default.yml', ''],
  ];

  it('should allow to fetch a package from ES', async () => {
    const soClient = savedObjectsClientMock.create();

    soClient.bulkGet.mockResolvedValueOnce({
      saved_objects: PACKAGE_ASSETS.map(([path, content]) => ({
        id: `epm-packages-assets:${path}`,
        type: 'epm-packages-assets',
        attributes: {
          package_name: 'test',
          package_version: '1.0.0',
          install_source: 'registry',
          asset_path: path,
          media_type: 'text/plain',
          data_utf8: content,
          data_base64: '',
        },
        references: [],
        version: 'WzEwLDFd',
      })),
    });

    const test = await getEsPackage(
      'test',
      '1.0.0',
      PACKAGE_ASSETS.map(([path]) => ({
        id: `epm-packages-assets:${path}`,
        path,
        type: 'epm-packages-assets',
      })),
      soClient
    );

    expect(test?.paths).toEqual(PACKAGE_ASSETS.map(([path]) => path));
  });

  it('should return all paths even when filtering assets to fetch', async () => {
    const soClient = savedObjectsClientMock.create();

    soClient.bulkGet.mockResolvedValueOnce({
      saved_objects: PACKAGE_ASSETS.map(([path, content]) => ({
        id: `epm-packages-assets:${path}`,
        type: 'epm-packages-assets',
        attributes: {
          package_name: 'test',
          package_version: '1.0.0',
          install_source: 'registry',
          asset_path: path,
          media_type: 'text/plain',
          data_utf8: content,
          data_base64: '',
        },
        references: [],
        version: 'WzEwLDFd',
      })),
    });

    const test = await getEsPackage(
      'test',
      '1.0.0',
      PACKAGE_ASSETS.map(([path]) => ({
        id: `epm-packages-assets:${path}`,
        path,
        type: 'epm-packages-assets',
      })),
      soClient,
      {
        shouldFetchBuffer: (reference) => {
          return reference.path ? filterAssetPathForParseAndVerifyArchive(reference.path) : true;
        },
      }
    );

    expect(test?.paths).toEqual(PACKAGE_ASSETS.map(([path]) => path));

    const onlyPathAssets = soClient.bulkGet.mock.calls[0][0]
      .filter(({ fields }) => fields?.length === 1 && fields[0] === 'asset_path')
      .map(({ id }) => id);

    expect(onlyPathAssets).toMatchInlineSnapshot(`
      Array [
        "epm-packages-assets:test-1.0.0/LICENSE.txt",
        "epm-packages-assets:test-1.0.0/changelog.yml",
        "epm-packages-assets:test-1.0.0/docs/README.md",
        "epm-packages-assets:test-1.0.0/data_stream/ds1/elasticsearch/ingest_pipeline/default.yml",
      ]
    `);

    const withDataAssets = soClient.bulkGet.mock.calls[0][0]
      .filter(
        ({ fields }) =>
          fields?.length === 3 &&
          fields.includes('asset_path') &&
          fields.includes('data_utf8') &&
          fields.includes('data_base64')
      )
      .map(({ id }) => id);

    expect(withDataAssets).toMatchInlineSnapshot(`
      Array [
        "epm-packages-assets:test-1.0.0/manifest.yml",
        "epm-packages-assets:test-1.0.0/data_stream/ds1/manifest.yml",
      ]
    `);
  });
});
