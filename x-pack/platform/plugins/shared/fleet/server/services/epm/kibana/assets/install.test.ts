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

  it('resolves ambiguous_conflict by calling resolveImportErrors with the most-recently-updated destinationId', async () => {
    const asset = createAsset({ id: 'dashboard-abc', attributes: { hello: 'world' } });
    const ambiguousError: SavedObjectsImportFailure = {
      type: asset.type,
      id: asset.id,
      meta: {},
      error: {
        type: 'ambiguous_conflict',
        destinations: [
          { id: 'dest-older', updatedAt: '2024-01-01T00:00:00.000Z' },
          { id: 'dest-newer', updatedAt: '2025-06-01T00:00:00.000Z' },
        ],
      },
    };
    const ambiguousResponse = createImportResponse([ambiguousError]);
    const successResponse = createImportResponse([], [createImportSuccess(asset)]);

    mockImporter.import.mockResolvedValueOnce(ambiguousResponse);
    mockImporter.resolveImportErrors.mockResolvedValueOnce(successResponse);

    await installKibanaSavedObjects({
      savedObjectsImporter: mockImporter,
      logger: mockLogger,
      kibanaAssets: [asset],
    });

    expect(mockImporter.import).toHaveBeenCalledTimes(1);
    expect(mockImporter.resolveImportErrors).toHaveBeenCalledTimes(1);
    // Should pick the newer destination
    expect(mockImporter.resolveImportErrors).toHaveBeenCalledWith(
      expect.objectContaining({
        retries: expect.arrayContaining([
          expect.objectContaining({ id: asset.id, destinationId: 'dest-newer' }),
        ]),
      })
    );
  });

  it('throws if resolveImportErrors itself fails on ambiguous_conflict', async () => {
    const asset = createAsset({ id: 'dashboard-abc', attributes: {} });
    const ambiguousError: SavedObjectsImportFailure = {
      type: asset.type,
      id: asset.id,
      meta: {},
      error: {
        type: 'ambiguous_conflict',
        destinations: [{ id: 'dest-1', updatedAt: '2024-01-01T00:00:00.000Z' }],
      },
    };
    const ambiguousResponse = createImportResponse([ambiguousError]);
    // resolveImportErrors itself returns an error
    const resolveFailResponse = createImportResponse([createImportError(asset, 'conflict')]);

    mockImporter.import.mockResolvedValueOnce(ambiguousResponse);
    mockImporter.resolveImportErrors.mockResolvedValueOnce(resolveFailResponse);

    await expect(
      installKibanaSavedObjects({
        savedObjectsImporter: mockImporter,
        logger: mockLogger,
        kibanaAssets: [asset],
      })
    ).rejects.toThrow(/resolving ambiguous conflicts/);
  });

  it('deduplicates successResults when both ambiguous_conflict and missing_references resolve the same objects', async () => {
    const asset = createAsset({ id: 'dashboard-abc', attributes: {} });
    const ambiguousError: SavedObjectsImportFailure = {
      type: asset.type,
      id: asset.id,
      meta: {},
      error: {
        type: 'ambiguous_conflict',
        destinations: [{ id: 'dest-1', updatedAt: '2024-01-01T00:00:00.000Z' }],
      },
    };
    const refError: SavedObjectsImportFailure = {
      type: asset.type,
      id: asset.id,
      meta: {},
      error: { type: 'missing_references', references: [] },
    };
    // Import returns both error types for the same object
    const initialResponse = createImportResponse([ambiguousError, refError]);
    // Ambiguous pass resolves the object successfully
    const ambiguousResolveResponse = createImportResponse([], [createImportSuccess(asset)]);
    // Reference pass also resolves the same object successfully
    const refResolveResponse = createImportResponse([], [createImportSuccess(asset)]);

    mockImporter.import.mockResolvedValueOnce(initialResponse);
    mockImporter.resolveImportErrors
      .mockResolvedValueOnce(ambiguousResolveResponse)
      .mockResolvedValueOnce(refResolveResponse);

    const result = await installKibanaSavedObjects({
      savedObjectsImporter: mockImporter,
      logger: mockLogger,
      kibanaAssets: [asset],
    });

    // The object must appear only once despite being in both successResults
    expect(result.filter((r) => r.id === asset.id)).toHaveLength(1);
  });

  it('folds missing_references from ambiguous resolve pass into the reference-error handler instead of throwing', async () => {
    const asset = createAsset({ id: 'dashboard-abc', attributes: {} });
    const ambiguousError: SavedObjectsImportFailure = {
      type: asset.type,
      id: asset.id,
      meta: {},
      error: {
        type: 'ambiguous_conflict',
        destinations: [{ id: 'dest-1', updatedAt: '2024-01-01T00:00:00.000Z' }],
      },
    };
    // First import: ambiguous_conflict
    const ambiguousResponse = createImportResponse([ambiguousError]);
    // Ambiguous resolve pass re-surfaces a missing_references error (tolerable)
    const ambiguousResolveResponse = createImportResponse([
      createImportError(asset, 'missing_references'),
    ]);
    // Reference-error resolve pass succeeds
    const refResolveResponse = createImportResponse([], [createImportSuccess(asset)]);

    mockImporter.import.mockResolvedValueOnce(ambiguousResponse);
    mockImporter.resolveImportErrors
      .mockResolvedValueOnce(ambiguousResolveResponse)
      .mockResolvedValueOnce(refResolveResponse);

    // Should NOT throw — missing_references from the ambiguous pass is recoverable
    await expect(
      installKibanaSavedObjects({
        savedObjectsImporter: mockImporter,
        logger: mockLogger,
        kibanaAssets: [asset],
      })
    ).resolves.toBeDefined();

    // resolveImportErrors called twice: once for ambiguous, once for missing_references
    expect(mockImporter.resolveImportErrors).toHaveBeenCalledTimes(2);
  });

  it('carries destinationId into the missing-references retry so ambiguous_conflict is not re-raised', async () => {
    // Object has both ambiguous_conflict (from orphan) and missing_references (from a
    // legacy index pattern ref). Without forwarding destinationId, the second
    // resolveImportErrors call would re-trigger the origin search and re-raise
    // ambiguous_conflict, causing a KibanaSOReferenceError.
    const asset = createAsset({ id: 'dashboard-abc', attributes: {} });
    const ambiguousError: SavedObjectsImportFailure = {
      type: asset.type,
      id: asset.id,
      meta: {},
      error: {
        type: 'ambiguous_conflict',
        destinations: [{ id: 'dest-chosen', updatedAt: '2024-01-01T00:00:00.000Z' }],
      },
    };
    // Initial import raises ambiguous_conflict
    mockImporter.import.mockResolvedValueOnce(createImportResponse([ambiguousError]));
    // Ambiguous pass re-surfaces missing_references for the same object
    mockImporter.resolveImportErrors.mockResolvedValueOnce(
      createImportResponse([createImportError(asset, 'missing_references')])
    );
    // Missing-references pass succeeds
    mockImporter.resolveImportErrors.mockResolvedValueOnce(
      createImportResponse([], [createImportSuccess(asset)])
    );

    await installKibanaSavedObjects({
      savedObjectsImporter: mockImporter,
      logger: mockLogger,
      kibanaAssets: [asset],
    });

    // The second resolveImportErrors call (missing-references pass) must include
    // destinationId so checkOriginConflicts skips the origin search.
    expect(mockImporter.resolveImportErrors).toHaveBeenCalledTimes(2);
    expect(mockImporter.resolveImportErrors).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        retries: expect.arrayContaining([
          expect.objectContaining({ id: asset.id, destinationId: 'dest-chosen' }),
        ]),
      })
    );
  });

  it('does not throw on empty destinations array in ambiguous_conflict error', async () => {
    const asset = createAsset({ id: 'dashboard-abc', attributes: {} });
    const ambiguousError: SavedObjectsImportFailure = {
      type: asset.type,
      id: asset.id,
      meta: {},
      error: { type: 'ambiguous_conflict', destinations: [] },
    };
    const ambiguousResponse = createImportResponse([ambiguousError]);
    // resolveImportErrors is still called; it may fail or succeed
    const successResponse = createImportResponse([], [createImportSuccess(asset)]);
    mockImporter.import.mockResolvedValueOnce(ambiguousResponse);
    mockImporter.resolveImportErrors.mockResolvedValueOnce(successResponse);

    // Should not throw on the reduce() call
    await expect(
      installKibanaSavedObjects({
        savedObjectsImporter: mockImporter,
        logger: mockLogger,
        kibanaAssets: [asset],
      })
    ).resolves.toBeDefined();
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

  it('should rewrite alerting_rule_template IDs when installing as additional space', () => {
    const asset = createAsset({
      id: 'system-logs-template',
      type: KibanaSavedObjectType.alertingRuleTemplate,
      attributes: { name: '[System] Logs template' },
    });
    const result = createSavedObjectKibanaAsset(asset, {
      installAsAdditionalSpace: true,
      spaceId: 'my-space',
    });

    expect(result.id).not.toEqual('system-logs-template');
    expect(result.originId).toEqual('system-logs-template');
  });

  it('should not rewrite alerting_rule_template IDs for the primary install space', () => {
    const asset = createAsset({
      id: 'system-logs-template',
      type: KibanaSavedObjectType.alertingRuleTemplate,
      attributes: { name: '[System] Logs template' },
    });
    const result = createSavedObjectKibanaAsset(asset, {
      installAsAdditionalSpace: false,
      spaceId: 'default',
    });

    expect(result.id).toEqual('system-logs-template');
    expect(result.originId).toBeUndefined();
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

  it('preserves top-level id and originId even when the replacement map contains the originId value', () => {
    // Regression test: the old implementation serialized the whole SO and did a global
    // replace, which clobbered `originId` when the replacement map contained its value.
    const originalId = 'kubernetes-3d4d9290-bcb1-11ec-b64f-7dd6e8e82013';
    const newSpaceScopedId = 'a1b2c3d4-0000-0000-0000-000000000001';

    const dashboardAsset = {
      id: newSpaceScopedId,
      type: KibanaSavedObjectType.dashboard,
      originId: originalId,
      attributes: {
        description: `See [Pods](/app/dashboards#/view/${originalId})`,
      },
      references: [],
    } as any;

    const idReplacements = { [originalId]: newSpaceScopedId };

    const { updated, updatedAsset } = replaceIdsInKibanaAsset(dashboardAsset, idReplacements);

    expect(updated).toBe(true);
    // Identity fields must be untouched.
    expect(updatedAsset.id).toBe(newSpaceScopedId);
    expect(updatedAsset.originId).toBe(originalId);
    // The attribute content should have the replacement applied.
    expect((updatedAsset.attributes as any).description).toBe(
      `See [Pods](/app/dashboards#/view/${newSpaceScopedId})`
    );
  });

  it('handles ids containing regex metacharacters without throwing', () => {
    const idWithDots = 'some.id.with.dots+and[brackets]';
    const replacedId = 'safe-new-id';

    const dashboardAsset = createAsset({
      id: 'dashboard-meta',
      type: KibanaSavedObjectType.dashboard,
      attributes: { description: `ref to ${idWithDots}` },
    }) as any;

    const idReplacements = { [idWithDots]: replacedId };

    expect(() => replaceIdsInKibanaAsset(dashboardAsset, idReplacements)).not.toThrow();
    const { updated, updatedAsset } = replaceIdsInKibanaAsset(dashboardAsset, idReplacements);
    expect(updated).toBe(true);
    expect((updatedAsset.attributes as any).description).toBe(`ref to ${replacedId}`);
  });

  it('returns updated=false and the original asset when no replacements match', () => {
    const dashboardAsset = createAsset({
      id: 'dashboard-no-match',
      type: KibanaSavedObjectType.dashboard,
      attributes: { description: 'nothing to replace here' },
    }) as any;

    const { updated, updatedAsset } = replaceIdsInKibanaAsset(dashboardAsset, {
      'non-existent-id': 'new-id',
    });

    expect(updated).toBe(false);
    expect(updatedAsset).toBe(dashboardAsset);
  });
});
