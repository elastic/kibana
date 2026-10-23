/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: "Install content" off - Kibana assets are removed and none are imported.

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { SavedObject } from '@kbn/core/server';

import type { Installation } from '../../../../types';
import { saveKibanaAssetsRefs } from '../../packages/install';
import { deleteKibanaSavedObjectsAssets } from '../../packages/remove';

import { installKibanaAssetsAndReferences } from './install';
import { getSpaceAwareSaveobjectsClients } from './saved_objects';

jest.mock('../../packages/install', () => ({ saveKibanaAssetsRefs: jest.fn() }));
jest.mock('../../packages/remove', () => ({ deleteKibanaSavedObjectsAssets: jest.fn() }));
jest.mock('./saved_objects', () => ({ getSpaceAwareSaveobjectsClients: jest.fn() }));
jest.mock('./tag_assets', () => ({ tagKibanaAssets: jest.fn() }));

const importer = { import: jest.fn(), resolveImportErrors: jest.fn() };

describe('installKibanaAssetsAndReferences with skipKibanaAssets', () => {
  beforeEach(() => {
    jest.mocked(getSpaceAwareSaveobjectsClients).mockReturnValue({
      savedObjectsImporter: importer,
      savedObjectTagAssignmentService: {},
      savedObjectTagClient: {},
    } as any);
    jest.mocked(saveKibanaAssetsRefs).mockResolvedValue([]);
  });

  it('removes previously installed assets, imports nothing, saves no refs', async () => {
    const traverseEntries = jest.fn();
    const installedPkg = {
      id: 'nginx_otel',
      attributes: {
        installed_kibana_space_id: 'default',
        installed_kibana: [{ id: 'dash-1', type: 'dashboard' }],
      },
    } as unknown as SavedObject<Installation>;

    await installKibanaAssetsAndReferences({
      savedObjectsClient: savedObjectsClientMock.create(),
      logger: loggingSystemMock.createLogger(),
      pkgName: 'nginx_otel',
      pkgTitle: 'Nginx OpenTelemetry',
      packageInstallContext: {
        packageInfo: { name: 'nginx_otel', version: '1.0.0' } as any,
        paths: ['nginx_otel-1.0.0/kibana/dashboard/dash-1.json'],
        archiveIterator: { traverseEntries, getPaths: jest.fn() },
      },
      installedPkg,
      spaceId: 'default',
      skipKibanaAssets: true,
    });

    expect(deleteKibanaSavedObjectsAssets).toHaveBeenCalledWith(
      expect.objectContaining({ installedPkg, spaceId: 'default' })
    );
    expect(traverseEntries).not.toHaveBeenCalled();
    expect(importer.import).not.toHaveBeenCalled();
    expect(saveKibanaAssetsRefs).toHaveBeenCalledWith(
      expect.anything(),
      'nginx_otel',
      [],
      'default',
      false
    );
  });
});
