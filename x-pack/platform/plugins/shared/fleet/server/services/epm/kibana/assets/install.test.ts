/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ISavedObjectsImporter,
  SavedObjectsImportFailure,
  SavedObjectsImportSuccess,
  SavedObjectsImportResponse,
} from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { KibanaSavedObjectType } from '../../../../../common/types/models/epm';

jest.mock('timers/promises', () => ({
  async setTimeout() {},
}));

import { replaceIdsInKibanaAsset, type ArchiveAsset } from './install';
import { createSavedObjectKibanaAsset, installKibanaSavedObjects } from './install';

const mockLogger = loggingSystemMock.createLogger();

const mockImporter: jest.Mocked<ISavedObjectsImporter> = {
  import: jest.fn(),
  resolveImportErrors: jest.fn(),
};

const createImportError = (so: ArchiveAsset, type: string) =>
  ({ id: so.id, error: { type } } as SavedObjectsImportFailure);
const createImportSuccess = (so: ArchiveAsset) =>
  ({ id: so.id, type: so.type, meta: {} } as SavedObjectsImportSuccess);
const createAsset = (asset: Partial<ArchiveAsset>) =>
  ({ id: 1234, type: 'dashboard', attributes: {}, ...asset } as ArchiveAsset);

const createImportResponse = (
  errors: SavedObjectsImportFailure[] = [],
  successResults: SavedObjectsImportSuccess[] = []
) =>
  ({
    success: !!successResults.length,
    errors,
    successResults,
    warnings: [],
    successCount: successResults.length,
  } as SavedObjectsImportResponse);

describe('installKibanaSavedObjects', () => {
  beforeEach(() => {
    mockImporter.import.mockReset();
    mockImporter.resolveImportErrors.mockReset();
  });

  it('should retry on conflict error', async () => {
    const asset = createAsset({ attributes: { hello: 'world' } });
    const conflictResponse = createImportResponse([createImportError(asset, 'conflict')]);
    const successResponse = createImportResponse([], [createImportSuccess(asset)]);

    mockImporter.import
      .mockResolvedValueOnce(conflictResponse)
      .mockResolvedValueOnce(successResponse);

    await installKibanaSavedObjects({
      savedObjectsImporter: mockImporter,
      logger: mockLogger,
      kibanaAssets: [asset],
    });

    expect(mockImporter.import).toHaveBeenCalledTimes(2);
  });

  it('should give up after 50 retries on conflict errors', async () => {
    const asset = createAsset({ attributes: { hello: 'world' } });
    const conflictResponse = createImportResponse([createImportError(asset, 'conflict')]);

    mockImporter.import.mockImplementation(() => Promise.resolve(conflictResponse));

    await expect(
      installKibanaSavedObjects({
        savedObjectsImporter: mockImporter,
        logger: mockLogger,
        kibanaAssets: [asset],
      })
    ).rejects.toEqual(expect.any(Error));
    expect(mockImporter.import).toHaveBeenCalledTimes(51);
  });
  it('should not retry errors that arent conflict errors', async () => {
    const asset = createAsset({ attributes: { hello: 'world' } });
    const errorResponse = createImportResponse([createImportError(asset, 'something_bad')]);
    const successResponse = createImportResponse([], [createImportSuccess(asset)]);

    mockImporter.import.mockResolvedValueOnce(errorResponse).mockResolvedValueOnce(successResponse);

    await expect(
      installKibanaSavedObjects({
        savedObjectsImporter: mockImporter,
        logger: mockLogger,
        kibanaAssets: [asset],
      })
    ).rejects.toEqual(expect.any(Error));
  });

  it('should resolve reference errors', async () => {
    const asset = createAsset({ attributes: { hello: 'world' } });
    const referenceErrorResponse = createImportResponse([
      createImportError(asset, 'missing_references'),
    ]);
    const successResponse = createImportResponse([], [createImportSuccess(asset)]);

    mockImporter.import.mockResolvedValueOnce(referenceErrorResponse);
    mockImporter.resolveImportErrors.mockResolvedValueOnce(successResponse);

    await installKibanaSavedObjects({
      savedObjectsImporter: mockImporter,
      logger: mockLogger,
      kibanaAssets: [asset],
    });

    expect(mockImporter.import).toHaveBeenCalledTimes(1);
    expect(mockImporter.resolveImportErrors).toHaveBeenCalledTimes(1);
  });
});

describe('createSavedObjectKibanaAsset', () => {
  it('should set migrationVersion as typeMigrationVersion in so', () => {
    const asset = createAsset({
      attributes: { hello: 'world' },
      migrationVersion: { dashboard: '8.6.0' },
    });
    const result = createSavedObjectKibanaAsset(asset);

    expect(result.typeMigrationVersion).toEqual('8.6.0');
  });

  it('should set coreMigrationVersion and typeMigrationVersion in so', () => {
    const asset = createAsset({
      attributes: { hello: 'world' },
      typeMigrationVersion: '8.6.0',
      coreMigrationVersion: '8.7.0',
    });
    const result = createSavedObjectKibanaAsset(asset);

    expect(result.typeMigrationVersion).toEqual('8.6.0');
    expect(result.coreMigrationVersion).toEqual('8.7.0');
  });
});

describe('replaceIdsInKibanaAsset', () => {
  it('should replace ids in dashboard and visualization assets', () => {
    const dashboardAsset = createAsset({
      id: 'dashboard-1',
      type: KibanaSavedObjectType.dashboard,
      attributes: {
        panelsJSON: JSON.stringify([
          {
            type: 'DASHBOARD_MARKDOWN',
            embeddableConfig: {
              content:
                '[test](/app/dashboards#/view/dashboard-test-123-456)\n[test2_replaced_multiple_times](/app/dashboards#/view/dashboard-test-123-456)',
            },
            panelIndex: '112190c3-da65-4d7e-b811-d97bcf69a412',
            gridData: { x: 0, y: 0, w: 24, h: 15, i: '112190c3-da65-4d7e-b811-d97bcf69a412' },
          },
        ]),
      },
    }) as any;

    const idReplacements = {
      'dashboard-test-123-456': 'dashboard-test-123-456-replaced',
      'viz-2': 'new-viz-2',
    };

    const { updated, updatedAsset } = replaceIdsInKibanaAsset(dashboardAsset, idReplacements);

    expect(updated).toBe(true);
    const panels = JSON.parse((updatedAsset.attributes as any).panelsJSON);
    expect(panels).toMatchInlineSnapshot(`
      Array [
        Object {
          "embeddableConfig": Object {
            "content": "[test](/app/dashboards#/view/dashboard-test-123-456-replaced)
      [test2_replaced_multiple_times](/app/dashboards#/view/dashboard-test-123-456-replaced)",
          },
          "gridData": Object {
            "h": 15,
            "i": "112190c3-da65-4d7e-b811-d97bcf69a412",
            "w": 24,
            "x": 0,
            "y": 0,
          },
          "panelIndex": "112190c3-da65-4d7e-b811-d97bcf69a412",
          "type": "DASHBOARD_MARKDOWN",
        },
      ]
    `);
  });
});
