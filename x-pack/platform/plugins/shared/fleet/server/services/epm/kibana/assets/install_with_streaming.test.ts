/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { KibanaSavedObjectType } from '../../../../types';
import { createArchiveIteratorFromMap } from '../../archive/archive_iterator';
import { appContextService } from '../../../app_context';
import { createAppContextStartContractMock } from '../../../../mocks';

import { installKibanaAssetsWithStreaming } from './install_with_streaming';

jest.mock('./saved_objects', () => ({
  getSpaceAwareSaveobjectsClients: jest.fn(),
}));

jest.mock('./install', () => ({
  ...jest.requireActual('./install'),
  installManagedIndexPattern: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../packages/install', () => ({
  ...jest.requireActual('../../packages/install'),
  saveKibanaAssetsRefs: jest.fn().mockResolvedValue(undefined),
}));

const { getSpaceAwareSaveobjectsClients } = jest.requireMock('./saved_objects');

const makeArchiveBuffer = (id: string, soType: string) =>
  Buffer.from(JSON.stringify({ id, type: soType, attributes: { title: id } }));

describe('installKibanaAssetsWithStreaming', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let soClientWithSpace: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    soClientWithSpace = savedObjectsClientMock.create();
    soClientWithSpace.bulkCreate.mockResolvedValue({ saved_objects: [] });

    getSpaceAwareSaveobjectsClients.mockReturnValue({
      savedObjectClientWithSpace: soClientWithSpace,
      savedObjectsImporter: { import: jest.fn().mockResolvedValue({ errors: [] }) },
      savedObjectTagAssignmentService: jest.fn(),
      savedObjectTagClient: jest.fn(),
    });

    appContextService.start(createAppContextStartContractMock());
  });

  it('should not include reserved index patterns (metrics-*, logs-*) in returned assetRefs', async () => {
    const assetsMap = new Map([
      [
        'test-package-1.0.0/kibana/index_pattern/metrics-star.json',
        makeArchiveBuffer('metrics-*', 'index-pattern'),
      ],
      [
        'test-package-1.0.0/kibana/index_pattern/logs-star.json',
        makeArchiveBuffer('logs-*', 'index-pattern'),
      ],
      [
        'test-package-1.0.0/kibana/dashboard/my-dashboard.json',
        makeArchiveBuffer('my-dashboard', 'dashboard'),
      ],
    ]);

    const refs = await installKibanaAssetsWithStreaming({
      spaceId: 'default',
      packageInstallContext: {
        archiveIterator: createArchiveIteratorFromMap(assetsMap),
        paths: [...assetsMap.keys()],
        packageInfo: {
          title: 'Test',
          name: 'test-package',
          version: '1.0.0',
          description: 'test',
          type: 'integration',
          categories: [],
          format_version: '1.0.0',
          release: 'ga',
          conditions: {},
          owner: { github: 'elastic/fleet' },
        } as any,
      },
      savedObjectsClient: soClient,
      pkgName: 'test-package',
    });

    const refIds = refs.map((r) => r.id);
    expect(refIds).not.toContain('metrics-*');
    expect(refIds).not.toContain('logs-*');
    expect(refIds).toContain('my-dashboard');
  });

  it('should return empty refs when archive contains only reserved index patterns', async () => {
    const assetsMap = new Map([
      [
        'test-package-1.0.0/kibana/index_pattern/metrics-star.json',
        makeArchiveBuffer('metrics-*', 'index-pattern'),
      ],
      [
        'test-package-1.0.0/kibana/index_pattern/logs-star.json',
        makeArchiveBuffer('logs-*', 'index-pattern'),
      ],
    ]);

    const refs = await installKibanaAssetsWithStreaming({
      spaceId: 'default',
      packageInstallContext: {
        archiveIterator: createArchiveIteratorFromMap(assetsMap),
        paths: [...assetsMap.keys()],
        packageInfo: {
          title: 'Test',
          name: 'test-package',
          version: '1.0.0',
          description: 'test',
          type: 'integration',
          categories: [],
          format_version: '1.0.0',
          release: 'ga',
          conditions: {},
          owner: { github: 'elastic/fleet' },
        } as any,
      },
      savedObjectsClient: soClient,
      pkgName: 'test-package',
    });

    expect(refs).toEqual([]);
    expect(soClientWithSpace.bulkCreate).not.toBeCalled();
  });

  it('should include non-reserved index patterns in returned assetRefs', async () => {
    const assetsMap = new Map([
      [
        'test-package-1.0.0/kibana/index_pattern/custom-index-pattern.json',
        makeArchiveBuffer('custom-index-pattern', 'index-pattern'),
      ],
    ]);

    const refs = await installKibanaAssetsWithStreaming({
      spaceId: 'default',
      packageInstallContext: {
        archiveIterator: createArchiveIteratorFromMap(assetsMap),
        paths: [...assetsMap.keys()],
        packageInfo: {
          title: 'Test',
          name: 'test-package',
          version: '1.0.0',
          description: 'test',
          type: 'integration',
          categories: [],
          format_version: '1.0.0',
          release: 'ga',
          conditions: {},
          owner: { github: 'elastic/fleet' },
        } as any,
      },
      savedObjectsClient: soClient,
      pkgName: 'test-package',
    });

    expect(refs).toEqual([
      { id: 'custom-index-pattern', type: KibanaSavedObjectType.indexPattern },
    ]);
  });
});
