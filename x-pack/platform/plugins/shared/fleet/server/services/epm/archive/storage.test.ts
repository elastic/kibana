/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import {
  archiveEntryToESDocument,
  getAsset,
  getEsPackage,
  packageAssetToArchiveEntry,
} from './storage';
import { appContextService } from '../../app_context';
import { createAppContextStartContractMock } from '../../../mocks';
import { PackageInvalidArchiveError } from '../../../errors';
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

describe('archiveEntryToESDocument', () => {
  const toDocument = (path: string, buffer: Buffer) =>
    archiveEntryToESDocument({
      path,
      buffer,
      name: 'test',
      version: '1.0.0',
      installSource: 'registry',
    });

  it('should store a text asset as utf8', async () => {
    const result = await toDocument('test-1.0.0/manifest.yml', Buffer.from('name: test\n'));
    expect(result).toEqual({
      package_name: 'test',
      package_version: '1.0.0',
      install_source: 'registry',
      asset_path: 'test-1.0.0/manifest.yml',
      media_type: 'text/yaml; charset=utf-8',
      data_utf8: 'name: test\n',
      data_base64: '',
    });
  });

  it('should store a text asset with multibyte characters as utf8', async () => {
    const content = '# Zażółć gęślą jaźń 日本語 ✓\n';
    const result = await toDocument('test-1.0.0/docs/README.md', Buffer.from(content));
    expect(result.data_utf8).toBe(content);
    expect(result.data_base64).toBe('');
  });

  it('should store a binary asset as base64', async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00,
    ]);
    const result = await toDocument('test-1.0.0/img/logo.png', png);
    expect(result.media_type).toBe('image/png');
    expect(result.data_utf8).toBe('');
    expect(result.data_base64).toBe(png.toString('base64'));
  });

  it.each([
    ['UTF-16LE without BOM', Buffer.from('café', 'utf16le')],
    ['UTF-16BE without BOM', Buffer.from('café', 'utf16le').swap16()],
    [
      'UTF-16LE with BOM',
      Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('café', 'utf16le')]),
    ],
    ['Latin-1', Buffer.from('café résumé', 'latin1')],
    [
      'invalid UTF-8 after offset 512',
      Buffer.concat([Buffer.alloc(600, 'a'), Buffer.from([0xe9])]),
    ],
    ['valid UTF-8 containing NUL bytes', Buffer.from('abc\0def\0')],
  ])('should preserve bytes for %s', async (_, buffer) => {
    const document = await toDocument('test-1.0.0/data/file.txt', buffer);
    expect(packageAssetToArchiveEntry(document).buffer).toEqual(buffer);
  });

  describe('size limits', () => {
    const size = 3 * 1024 * 1024 + 1;

    it('should reject a non-UTF-8 asset whose base64 encoding exceeds the limit', async () => {
      const result = toDocument('test-1.0.0/data/large.bin', Buffer.alloc(size, 0xff));
      await expect(result).rejects.toThrow(PackageInvalidArchiveError);
      await expect(result).rejects.toThrow(/^After base64 encoding file at/);
    });

    it('should accept a UTF-8 asset of the same byte size', async () => {
      const result = await toDocument('test-1.0.0/data/large.txt', Buffer.alloc(size, 'a'));
      expect(result.data_utf8).toHaveLength(size);
    });
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
