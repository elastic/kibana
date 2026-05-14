/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, SavedObject } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
import { CASE_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';
import {
  asDataView,
  makeDataViewsPluginStart,
  makeDataViewWithRuntime,
  makeMockDvService,
  makeTemplate,
  stubFindOnePage,
  stubFindWithPages,
  type MockDvService,
  type TemplateLike,
} from '../__test_helpers__';
import { CasesAnalyticsV2DataViewService } from './service';
import { getCaseDataViewId } from './data_view_specs';

describe('CasesAnalyticsV2DataViewService', () => {
  const spaceId = 'default';
  const dataViewId = getCaseDataViewId(spaceId);

  /**
   * Single setup helper used by every describe block — wires the mock
   * internal SO client (with templates the test cares about) and a mock
   * data views service into a real `CasesAnalyticsV2DataViewService`,
   * and returns the deps any test needs to call `ensureForSpace` /
   * `refreshForSpace`.
   */
  const setup = (templates: Array<SavedObject<TemplateLike>> = []) => {
    const internalSoClient = savedObjectsClientMock.create();
    stubFindOnePage(internalSoClient, templates);

    const dvService = makeMockDvService();
    const dataViewsService = makeDataViewsPluginStart(dvService);
    const logger = loggerMock.create();

    const service = new CasesAnalyticsV2DataViewService({
      logger,
      dataViewsService,
      internalSavedObjectsClient: internalSoClient,
    });

    return {
      service,
      dvService,
      logger,
      internalSoClient,
      deps: {
        spaceId,
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as unknown as ElasticsearchClient,
        request: {} as unknown as KibanaRequest,
      },
    };
  };

  /** Pre-seed `dvService.get` to throw the canonical 404 the production code handles. */
  const stubMissingDataView = (dvService: MockDvService) => {
    dvService.get.mockRejectedValueOnce(Object.assign(new Error('not found'), { statusCode: 404 }));
  };

  describe('ensureForSpace', () => {
    it('reads template field metadata from attributes.fieldNames (not the YAML definition string)', async () => {
      // The persisted contract is `attributes.fieldNames`; reaching for
      // `attributes.definition.fields` would be `undefined` (definition
      // is a YAML string), silently emptying the runtime field map.
      const { service, dvService, deps } = setup([
        makeTemplate('tpl-1', [{ name: 'risk', type: 'long', control: 'INPUT_NUMBER' }]),
      ]);
      stubMissingDataView(dvService);

      await service.ensureForSpace(deps);

      expect(dvService.createAndSave).toHaveBeenCalledTimes(1);
      const [spec] = dvService.createAndSave.mock.calls[0];
      expect(Object.keys(spec.runtimeFieldMap ?? {})).toEqual(['cases.risk_as_long']);
    });

    it('creates the data view with the freshly-computed runtime fields when it does not exist', async () => {
      const { service, dvService, deps } = setup([
        makeTemplate('tpl-1', [{ name: 'score', type: 'double', control: 'INPUT_NUMBER' }]),
      ]);
      stubMissingDataView(dvService);

      await service.ensureForSpace(deps);

      expect(dvService.createAndSave).toHaveBeenCalledTimes(1);
      const [spec, overwrite, skipFetchFields] = dvService.createAndSave.mock.calls[0];
      expect(spec.id).toBe(dataViewId);
      expect(spec.runtimeFieldMap).toMatchObject({ 'cases.score_as_double': { type: 'double' } });
      expect(overwrite).toBe(false);
      expect(skipFetchFields).toBe(true);
      expect(dvService.updateSavedObject).not.toHaveBeenCalled();
    });

    it('updates the existing data view when the runtime field map has drifted', async () => {
      const { service, dvService, deps } = setup([
        makeTemplate('tpl-1', [{ name: 'risk', type: 'long', control: 'INPUT_NUMBER' }]),
      ]);
      // Fixture: existing data view holds `risk_as_double`; live template
      // declares `risk_as_long`. Diff must detect drift and update.
      const existing = makeDataViewWithRuntime(dataViewId, {
        'cases.risk_as_double': {
          type: 'double',
          script: { source: 'emit(0)' },
        } as unknown as RuntimeFieldSpec,
      });
      dvService.get.mockResolvedValueOnce(asDataView(existing));

      await service.ensureForSpace(deps);

      expect(existing.replaceAllRuntimeFields).toHaveBeenCalledTimes(1);
      const [newMap] = existing.replaceAllRuntimeFields.mock.calls[0];
      expect(Object.keys(newMap)).toEqual(['cases.risk_as_long']);
      expect(dvService.updateSavedObject).toHaveBeenCalledWith(existing);
      expect(dvService.createAndSave).not.toHaveBeenCalled();
    });

    it('short-circuits subsequent same-process calls for the same space (in-memory cache)', async () => {
      const { service, dvService, deps } = setup([]);
      stubMissingDataView(dvService);

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

    /**
     * FAILURE SCENARIO: Stale or soft-deleted templates poison the runtime field map
     * Symptom: A renamed template (`score_as_long → priority_as_keyword`)
     *          would still publish the old `score_as_long` runtime field
     *          forever, because old template versions and soft-deleted
     *          rows are still visible to a naive `find()`. The data view
     *          would accumulate ghost fields.
     * Log signature: none — this is a silent correctness drift.
     * Trigger: Any template `update` (creates a new version, marks the
     *          old one `isLatest: false`) or `delete` (sets `deletedAt`).
     * Recovery: First filtered ensure recomputes the map without the
     *          stale entries.
     */
    it('filters templates by isLatest=true AND deletedAt=null and only requests the fieldNames attribute', async () => {
      const { service, dvService, deps, internalSoClient } = setup([]);
      stubMissingDataView(dvService);

      await service.ensureForSpace(deps);

      expect(internalSoClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: CASE_TEMPLATE_SAVED_OBJECT,
          namespaces: [spaceId],
          fields: ['fieldNames'],
          filter: expect.stringContaining('isLatest: true'),
        })
      );
      const findArgs = internalSoClient.find.mock.calls[0]?.[0] as { filter: string };
      expect(findArgs.filter).toContain('NOT');
      expect(findArgs.filter).toContain('deletedAt');
    });
  });

  describe('refreshForSpace', () => {
    it('always re-fetches templates so template lifecycle changes propagate', async () => {
      // ensureForSpace would short-circuit on a fresh cache entry; refresh
      // must not. The contract refresh callers (template create / update /
      // delete hooks) rely on: "I just changed something, look again".
      const { service, dvService, deps, internalSoClient } = setup([
        makeTemplate('tpl-1', [{ name: 'risk', type: 'long', control: 'INPUT_NUMBER' }]),
      ]);
      stubMissingDataView(dvService);

      await service.ensureForSpace(deps);
      const fetchesAfterEnsure = (internalSoClient.find as jest.Mock).mock.calls.length;

      await service.refreshForSpace(deps);

      expect((internalSoClient.find as jest.Mock).mock.calls.length).toBeGreaterThan(
        fetchesAfterEnsure
      );
    });

    it('runs the data view update when the recomputed snake-key set differs from the cached one', async () => {
      const { service, dvService, deps, internalSoClient } = setup([]);
      // Pages: ensure sees one template; refresh sees a different template.
      // The fingerprint differs, so the diff branch fires on refresh.
      stubFindWithPages(internalSoClient, [
        [makeTemplate('tpl-1', [{ name: 'risk', type: 'long', control: 'INPUT_NUMBER' }])],
        [makeTemplate('tpl-1', [{ name: 'priority', type: 'keyword', control: 'INPUT_TEXT' }])],
      ]);
      stubMissingDataView(dvService);
      await service.ensureForSpace(deps);
      dvService.createAndSave.mockClear();

      const existing = makeDataViewWithRuntime(dataViewId, {
        'cases.risk_as_long': {
          type: 'long',
          script: { source: 'emit(0)' },
        } as unknown as RuntimeFieldSpec,
      });
      dvService.get.mockResolvedValueOnce(asDataView(existing));

      await service.refreshForSpace(deps);

      expect(existing.replaceAllRuntimeFields).toHaveBeenCalledTimes(1);
      const [newMap] = existing.replaceAllRuntimeFields.mock.calls[0];
      expect(Object.keys(newMap)).toEqual(['cases.priority_as_keyword']);
      expect(dvService.updateSavedObject).toHaveBeenCalledWith(existing);
    });

    it('skips the data view fetch and update when the recomputed fingerprint matches the cached one', async () => {
      // Same templates on both calls → same fingerprint → no work past the
      // templates fetch. This is the optimization: most template edits
      // (rename, tags, validation) don't change snake-keys at all.
      const { service, dvService, deps, internalSoClient } = setup([]);
      stubFindWithPages(internalSoClient, [
        [makeTemplate('tpl-1', [{ name: 'score', type: 'long', control: 'INPUT_NUMBER' }])],
        [makeTemplate('tpl-1', [{ name: 'score', type: 'long', control: 'INPUT_NUMBER' }])],
      ]);
      stubMissingDataView(dvService);
      await service.ensureForSpace(deps);
      dvService.get.mockClear();
      dvService.createAndSave.mockClear();
      dvService.updateSavedObject.mockClear();

      await service.refreshForSpace(deps);

      // Fingerprint short-circuit kicked in: no DV fetch, no DV update.
      expect(dvService.get).not.toHaveBeenCalled();
      expect(dvService.createAndSave).not.toHaveBeenCalled();
      expect(dvService.updateSavedObject).not.toHaveBeenCalled();
    });
  });

  describe('clearBootstrapCache', () => {
    it('forces the next ensureForSpace call to re-run', async () => {
      const { service, dvService, deps } = setup([]);
      stubMissingDataView(dvService);

      await service.ensureForSpace(deps);
      service.clearBootstrapCache();

      // Second ensure runs again because the cache was cleared.
      stubMissingDataView(dvService);
      await service.ensureForSpace(deps);

      expect(dvService.createAndSave).toHaveBeenCalledTimes(2);
    });
  });

  describe('fingerprint cache', () => {
    /**
     * FAILURE SCENARIO: Per-request hot-path cost compounds across thousands of spaces
     * Symptom: At thousands-of-spaces scale, every cases request that
     *          touches the data view service incurs an SO `get` + a deep
     *          `isEqual` over the runtime field map. Most are no-ops
     *          because the snake-key set hasn't actually changed.
     * Log signature: none — silent CPU + I/O burn.
     * Trigger: Sustained traffic across many spaces with stable templates.
     * Recovery: Fingerprint cache short-circuits the diff path on hit.
     */
    it('skips the data view fetch on a within-TTL fingerprint hit', async () => {
      // Two refreshForSpace calls with identical templates. The first
      // primes the fingerprint cache; the second must skip the DV fetch.
      const { service, dvService, deps, internalSoClient } = setup([]);
      stubFindWithPages(internalSoClient, [
        [makeTemplate('tpl-1', [{ name: 'risk', type: 'long', control: 'INPUT_NUMBER' }])],
        [makeTemplate('tpl-1', [{ name: 'risk', type: 'long', control: 'INPUT_NUMBER' }])],
      ]);
      stubMissingDataView(dvService);

      await service.refreshForSpace(deps);
      const dvGetsAfterFirst = dvService.get.mock.calls.length;

      await service.refreshForSpace(deps);

      expect(dvService.get).toHaveBeenCalledTimes(dvGetsAfterFirst);
    });

    it('runs the diff path when the fingerprint changes (template field added)', async () => {
      // Page 1: 1 snake-key. Page 2: 2 snake-keys. Fingerprints differ.
      const { service, dvService, deps, internalSoClient } = setup([]);
      stubFindWithPages(internalSoClient, [
        [makeTemplate('tpl-1', [{ name: 'risk', type: 'long', control: 'INPUT_NUMBER' }])],
        [
          makeTemplate('tpl-1', [
            { name: 'risk', type: 'long', control: 'INPUT_NUMBER' },
            { name: 'priority', type: 'keyword', control: 'INPUT_TEXT' },
          ]),
        ],
      ]);
      stubMissingDataView(dvService);
      await service.refreshForSpace(deps);
      dvService.createAndSave.mockClear();

      const existing = makeDataViewWithRuntime(dataViewId, {
        'cases.risk_as_long': {
          type: 'long',
          script: { source: 'emit(0)' },
        } as unknown as RuntimeFieldSpec,
      });
      dvService.get.mockResolvedValueOnce(asDataView(existing));

      await service.refreshForSpace(deps);

      expect(existing.replaceAllRuntimeFields).toHaveBeenCalledTimes(1);
      const [newMap] = existing.replaceAllRuntimeFields.mock.calls[0];
      expect(new Set(Object.keys(newMap))).toEqual(
        new Set(['cases.risk_as_long', 'cases.priority_as_keyword'])
      );
    });

    it('does not cache the fingerprint when the ensure path throws', async () => {
      // A failure inside ensureOrRefreshForSpace must NOT poison the cache
      // — otherwise the next request would short-circuit on a fingerprint
      // that was never actually applied to a data view.
      const { service, dvService, deps } = setup([
        makeTemplate('tpl-1', [{ name: 'risk', type: 'long', control: 'INPUT_NUMBER' }]),
      ]);
      dvService.get.mockRejectedValueOnce(new Error('cluster unavailable'));

      await service.ensureForSpace(deps);

      // Second call must do real work — the failed call shouldn't have
      // populated the fingerprint cache.
      stubMissingDataView(dvService);
      await service.ensureForSpace(deps);

      expect(dvService.createAndSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('bootstrap cache TTL', () => {
    /**
     * FAILURE SCENARIO: Out-of-band data view deletion silently freezes runtime fields
     * Symptom: An administrator deletes a per-space cases data view via the
     *          Stack Management UI (not via the `/reset` route, which would
     *          clear the cache). The Cases data view never reappears for
     *          the lifetime of the Kibana process — Discover / Lens show
     *          "no data view".
     * Log signature: `cases-analyticsV2: data view ensure failed` (only on
     *          subsequent failures); the silent freeze itself produces no
     *          log line.
     * Trigger: Admin deletes the SO directly. The in-memory cache still says
     *          "bootstrapped" so `ensureForSpace` short-circuits forever.
     * Recovery: Self-heals at the next request after the TTL elapses
     *          (`BOOTSTRAP_CACHE_TTL_MS`). Faster recovery: hit `/reset`,
     *          which calls `clearBootstrapCache` directly.
     */
    it('re-runs the ensure path after the TTL elapses, recreating a missing data view', async () => {
      // Bespoke wiring: the test owns the wall clock via a `now()` override,
      // so it can't share `setup()`'s real-time service instance.
      const internalSoClient = savedObjectsClientMock.create();
      stubFindOnePage(internalSoClient, []);
      const dvService = makeMockDvService();

      let nowMs = 1_700_000_000_000;
      class TtlControlledService extends CasesAnalyticsV2DataViewService {
        protected now(): number {
          return nowMs;
        }
      }
      const parentLogger = loggerMock.create();
      const service = new TtlControlledService({
        logger: parentLogger,
        dataViewsService: makeDataViewsPluginStart(dvService),
        internalSavedObjectsClient: internalSoClient,
      });
      // `logger.get('dataView')` is what the service holds onto for its
      // own log calls; the parent mock's `.get` returns a child mock by
      // default so we resolve to the actual instance for assertions.
      const childLogger = (parentLogger.get as jest.Mock).mock.results[0]?.value as ReturnType<
        typeof loggerMock.create
      >;
      const deps = {
        spaceId,
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as unknown as ElasticsearchClient,
        request: {} as unknown as KibanaRequest,
      };

      // First ensure creates the data view and adds a fresh cache entry.
      stubMissingDataView(dvService);
      await service.ensureForSpace(deps);
      expect(dvService.createAndSave).toHaveBeenCalledTimes(1);

      // Within TTL: cache short-circuits, no extra get/create.
      dvService.get.mockClear();
      dvService.createAndSave.mockClear();
      nowMs += 60_000; // +1 minute
      await service.ensureForSpace(deps);
      expect(dvService.get).not.toHaveBeenCalled();
      expect(dvService.createAndSave).not.toHaveBeenCalled();

      // Past TTL with the data view deleted out-of-band: ensure re-runs and recreates.
      // The post-TTL re-check is logged at DEBUG so support cases ("user
      // reports no data view") can confirm the next request re-checked
      // instead of trusting a stale cache.
      nowMs += 6 * 60_000; // +6 more minutes (well past 5-minute TTL)
      stubMissingDataView(dvService);
      childLogger?.debug.mockClear?.();
      await service.ensureForSpace(deps);
      expect(dvService.get).toHaveBeenCalledTimes(1);
      expect(dvService.createAndSave).toHaveBeenCalledTimes(1);
      if (childLogger) {
        const debugCalls = (childLogger.debug as jest.Mock).mock.calls.map(
          ([msg]: [string]) => msg
        );
        expect(
          debugCalls.some((m) => m.includes('bootstrap cache expired') && m.includes(spaceId))
        ).toBe(true);
      }
    });
  });
});
