/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { DataView, DataViewSpec, RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { CASE_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';
import { CasesAnalyticsV2DataViewService } from './service';
import { getCaseDataViewId } from './data_view_specs';

// ----- Helpers -----

interface TemplateLike {
  fieldNames?: Array<{ name: string; label?: string; type: string; control?: string }>;
}

const makeTemplate = (
  id: string,
  fieldNames: NonNullable<TemplateLike['fieldNames']>
): SavedObject<TemplateLike> =>
  ({
    type: CASE_TEMPLATE_SAVED_OBJECT,
    id,
    namespaces: ['default'],
    references: [],
    attributes: { fieldNames },
  } as unknown as SavedObject<TemplateLike>);

const stubInternalSoClientWithTemplates = (
  client: ReturnType<typeof savedObjectsClientMock.create>,
  templates: Array<SavedObject<TemplateLike>>
): void => {
  let called = false;
  client.find.mockImplementation(async () => {
    if (called) {
      return {
        saved_objects: [],
        total: 0,
        per_page: 100,
        page: 1,
      } as SavedObjectsFindResponse<TemplateLike>;
    }
    called = true;
    return {
      saved_objects: templates as never,
      total: templates.length,
      per_page: 100,
      page: 1,
    } as SavedObjectsFindResponse<TemplateLike>;
  });
};

interface MockDvService {
  get: jest.Mock;
  createAndSave: jest.Mock;
  updateSavedObject: jest.Mock;
}

const makeDvService = (): MockDvService => ({
  get: jest.fn(),
  createAndSave: jest.fn(),
  updateSavedObject: jest.fn(),
});

const makeDataViewsPluginStart = (dvService: MockDvService): DataViewsServerPluginStart =>
  ({
    dataViewsServiceFactory: jest.fn().mockResolvedValue(dvService),
  } as unknown as DataViewsServerPluginStart);

interface MockDataView {
  id: string;
  toSpec: jest.Mock<DataViewSpec, []>;
  replaceAllRuntimeFields: jest.Mock<void, [Record<string, unknown>]>;
  __runtimeFieldMap: Record<string, RuntimeFieldSpec>;
}

const makeDataViewWithRuntime = (
  id: string,
  runtimeFieldMap: Record<string, RuntimeFieldSpec>
): MockDataView => {
  const dv: MockDataView = {
    id,
    __runtimeFieldMap: { ...runtimeFieldMap },
    toSpec: jest.fn(),
    replaceAllRuntimeFields: jest.fn(),
  };
  // `toSpec` returns a fresh shallow copy so the diff in the service uses
  // the recorded state, not whatever happens after `replaceAllRuntimeFields`.
  dv.toSpec.mockImplementation(
    () =>
      ({
        id,
        title: '.cases',
        runtimeFieldMap: { ...dv.__runtimeFieldMap },
      } as DataViewSpec)
  );
  // Mirror the real method's behaviour for any test that later calls
  // `toSpec` and expects to see the new map.
  dv.replaceAllRuntimeFields.mockImplementation((newMap) => {
    dv.__runtimeFieldMap = newMap as Record<string, RuntimeFieldSpec>;
  });
  return dv;
};

const ensureDeps = ({
  spaceId,
  savedObjectsClient,
  esClient,
  request,
}: {
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  request: KibanaRequest;
}) => ({ spaceId, savedObjectsClient, esClient, request });

// ----- Tests -----

describe('CasesAnalyticsV2DataViewService', () => {
  const spaceId = 'default';
  const dataViewId = getCaseDataViewId(spaceId);

  const setup = (templates: Array<SavedObject<TemplateLike>> = []) => {
    const internalSoClient = savedObjectsClientMock.create();
    stubInternalSoClientWithTemplates(internalSoClient, templates);

    const dvService = makeDvService();
    const dataViewsService = makeDataViewsPluginStart(dvService);
    const logger = loggerMock.create();

    const service = new CasesAnalyticsV2DataViewService({
      logger,
      dataViewsService,
      internalSavedObjectsClient: internalSoClient,
    });

    const requestSoClient = savedObjectsClientMock.create();
    const esClient = {} as unknown as ElasticsearchClient;
    const request = {} as unknown as KibanaRequest;

    return {
      service,
      dvService,
      logger,
      deps: ensureDeps({
        spaceId,
        savedObjectsClient: requestSoClient,
        esClient,
        request,
      }),
    };
  };

  describe('ensureForSpace', () => {
    it('reads template field metadata from attributes.fieldNames (not the YAML definition string)', async () => {
      // Regression guard: the persisted form is `attributes.fieldNames`. An
      // earlier implementation reached into `attributes.definition.fields`
      // — which is `undefined` because `definition` is a YAML string —
      // and the runtime field map silently came out empty for every space.
      const { service, dvService, deps } = setup([
        makeTemplate('tpl-1', [{ name: 'risk', type: 'long', control: 'INPUT_NUMBER' }]),
      ]);
      dvService.get.mockRejectedValueOnce(
        Object.assign(new Error('Saved object not found'), { statusCode: 404 })
      );

      await service.ensureForSpace(deps);

      expect(dvService.createAndSave).toHaveBeenCalledTimes(1);
      const [spec] = dvService.createAndSave.mock.calls[0];
      expect(Object.keys(spec.runtimeFieldMap ?? {})).toEqual(['cases.risk_as_long']);
    });

    it('creates the data view with the freshly-computed runtime fields when it does not exist', async () => {
      const { service, dvService, deps } = setup([
        makeTemplate('tpl-1', [{ name: 'score', type: 'double', control: 'INPUT_NUMBER' }]),
      ]);
      dvService.get.mockRejectedValueOnce(
        Object.assign(new Error('not found'), { statusCode: 404 })
      );

      await service.ensureForSpace(deps);

      expect(dvService.createAndSave).toHaveBeenCalledTimes(1);
      const [spec, overwrite, skipFetchFields] = dvService.createAndSave.mock.calls[0];
      expect(spec.id).toBe(dataViewId);
      expect(spec.runtimeFieldMap).toMatchObject({ 'cases.score_as_double': { type: 'double' } });
      expect(overwrite).toBe(false);
      expect(skipFetchFields).toBe(true);
      expect(dvService.updateSavedObject).not.toHaveBeenCalled();
    });

    it('skips updateSavedObject when the existing runtime field map already matches', async () => {
      const { service, dvService, deps } = setup([
        makeTemplate('tpl-1', [{ name: 'score', type: 'double', control: 'INPUT_NUMBER' }]),
      ]);
      // Pre-existing data view already carries the same runtime field; the
      // diff should detect equality and short-circuit.
      const existing = makeDataViewWithRuntime(dataViewId, {
        'cases.score_as_double': {
          type: 'double',
          script: { source: expect.any(String) as unknown as string },
        } as unknown as RuntimeFieldSpec,
      });
      dvService.get.mockResolvedValueOnce(existing as unknown as DataView);

      // Replace the runtime map on the mock with the exact spec the service
      // will compute, so isEqual returns true.
      const expectedMap = await captureExpectedRuntimeFieldMap(service, dvService, deps);
      existing.__runtimeFieldMap = expectedMap;

      // Re-run with the equality fixture in place.
      dvService.get.mockResolvedValueOnce(existing as unknown as DataView);
      dvService.createAndSave.mockClear();
      dvService.updateSavedObject.mockClear();

      await service.refreshForSpace(deps);

      expect(existing.replaceAllRuntimeFields).not.toHaveBeenCalled();
      expect(dvService.updateSavedObject).not.toHaveBeenCalled();
      expect(dvService.createAndSave).not.toHaveBeenCalled();
    });

    it('updates the existing data view when the runtime field map has drifted', async () => {
      const { service, dvService, deps } = setup([
        makeTemplate('tpl-1', [{ name: 'risk', type: 'long', control: 'INPUT_NUMBER' }]),
      ]);
      // Pre-existing data view holds a stale runtime field — the prior
      // template was a `double`, the live template is a `long`. Diff
      // should detect the mismatch and trigger an update.
      const existing = makeDataViewWithRuntime(dataViewId, {
        'cases.risk_as_double': {
          type: 'double',
          script: { source: 'emit(0)' },
        } as unknown as RuntimeFieldSpec,
      });
      dvService.get.mockResolvedValueOnce(existing as unknown as DataView);

      await service.ensureForSpace(deps);

      expect(existing.replaceAllRuntimeFields).toHaveBeenCalledTimes(1);
      const [newMap] = existing.replaceAllRuntimeFields.mock.calls[0];
      expect(Object.keys(newMap)).toEqual(['cases.risk_as_long']);
      expect(dvService.updateSavedObject).toHaveBeenCalledWith(existing);
      expect(dvService.createAndSave).not.toHaveBeenCalled();
    });

    it('short-circuits subsequent same-process calls for the same space (in-memory cache)', async () => {
      const { service, dvService, deps } = setup([]);
      dvService.get.mockRejectedValueOnce(
        Object.assign(new Error('not found'), { statusCode: 404 })
      );

      await service.ensureForSpace(deps);
      await service.ensureForSpace(deps);

      // Only one round of work, even though we called ensure twice.
      expect(dvService.get).toHaveBeenCalledTimes(1);
      expect(dvService.createAndSave).toHaveBeenCalledTimes(1);
    });

    it('does not throw past the service boundary on internal failures', async () => {
      const { service, dvService, deps, logger } = setup([]);
      dvService.get.mockRejectedValueOnce(new Error('cluster unavailable'));

      await expect(service.ensureForSpace(deps)).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
    });
  });

  describe('refreshForSpace', () => {
    it('bypasses the in-memory bootstrap cache so template-write hooks always re-run the diff', async () => {
      const { service, dvService, deps } = setup([
        makeTemplate('tpl-1', [{ name: 'risk', type: 'long', control: 'INPUT_NUMBER' }]),
      ]);
      dvService.get.mockRejectedValueOnce(
        Object.assign(new Error('not found'), { statusCode: 404 })
      );

      // First ensure: creates and adds the space to the cache.
      await service.ensureForSpace(deps);
      dvService.get.mockClear();
      dvService.createAndSave.mockClear();

      // Second pass via refresh: must NOT short-circuit, and the SO already
      // exists this time so it goes through the diff branch.
      const existing = makeDataViewWithRuntime(dataViewId, {});
      dvService.get.mockResolvedValueOnce(existing as unknown as DataView);

      await service.refreshForSpace(deps);

      expect(dvService.get).toHaveBeenCalledTimes(1);
      expect(existing.replaceAllRuntimeFields).toHaveBeenCalledTimes(1);
      expect(dvService.updateSavedObject).toHaveBeenCalledWith(existing);
    });
  });

  describe('clearBootstrapCache', () => {
    it('forces the next ensureForSpace call to re-run', async () => {
      const { service, dvService, deps } = setup([]);
      dvService.get.mockRejectedValueOnce(
        Object.assign(new Error('not found'), { statusCode: 404 })
      );

      await service.ensureForSpace(deps);
      service.clearBootstrapCache();

      // Second ensure runs again because the cache was cleared.
      dvService.get.mockRejectedValueOnce(
        Object.assign(new Error('not found'), { statusCode: 404 })
      );
      await service.ensureForSpace(deps);

      expect(dvService.createAndSave).toHaveBeenCalledTimes(2);
    });
  });
});

// ----- One-shot helper for the "no-op when current map matches" test -----

/**
 * Drives `ensureOrRefreshForSpace` once with a "data view doesn't exist"
 * mock, captures the runtime field map the service tried to create with,
 * and returns it. Lets the caller seed an existing-data-view mock with the
 * exact same map so the equality branch is exercised faithfully.
 */
async function captureExpectedRuntimeFieldMap(
  service: CasesAnalyticsV2DataViewService,
  dvService: MockDvService,
  deps: Parameters<CasesAnalyticsV2DataViewService['ensureForSpace']>[0]
): Promise<Record<string, RuntimeFieldSpec>> {
  service.clearBootstrapCache();
  dvService.get.mockRejectedValueOnce(Object.assign(new Error('not found'), { statusCode: 404 }));
  await service.refreshForSpace(deps);
  const lastCreate = dvService.createAndSave.mock.calls.at(-1);
  const map =
    (lastCreate?.[0]?.runtimeFieldMap as Record<string, RuntimeFieldSpec> | undefined) ?? {};
  service.clearBootstrapCache();
  return map;
}
