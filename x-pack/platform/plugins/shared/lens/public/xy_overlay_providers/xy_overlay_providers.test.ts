/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import {
  queryHasStatsCommand,
  queryHasTsSourceCommand,
  type LensXYOverlayProvider,
  type LensXYOverlayFetchContext,
  type LensXYOverlayLayer,
  type LensXYOverlayMatchContext,
} from '@kbn/lens-common';
import {
  createXYOverlayProviderRegistry,
  dispatchOverlayPointClick,
  getXYOverlayMatchContext,
  MAX_XY_OVERLAY_POINTS,
  resolveActiveProviders,
  runActiveProviders,
} from '.';

const TS_QUERY = 'TS metrics-* | STATS AVG(http.server.request.duration) BY TBUCKET(1m)';

const exemplarsTable: Datatable = {
  type: 'datatable',
  columns: [
    { id: '@timestamp', name: '@timestamp', meta: { type: 'date' } },
    { id: 'value', name: 'value', meta: { type: 'number' } },
    { id: 'trace_id', name: 'trace_id', meta: { type: 'string' } },
  ],
  rows: [{ '@timestamp': 1000, value: 42, trace_id: 'abc' }],
};

const createExemplarsOverlayProvider = (
  overrides: Partial<LensXYOverlayProvider> = {}
): LensXYOverlayProvider => ({
  id: 'observability.exemplars',
  isApplicable: ({ executionContext }, { esql }) =>
    executionContext?.name === 'discover' &&
    queryHasTsSourceCommand(esql) &&
    queryHasStatsCommand(esql),
  fetchOverlay: async ({ layer, executeEsql }) => {
    const { rows } = await executeEsql(`SET exemplars={"limit": 500};\n${layer.esql}`, {
      title: 'Exemplars',
    });
    return {
      type: 'points',
      title: 'Exemplars',
      data: rows,
      xAccessor: '@timestamp',
      yAccessor: 'value',
    };
  },
  ...overrides,
});

const createAttributes = (esqlByLayer: Record<string, string>) => ({
  visualizationType: 'lnsXY',
  state: {
    datasourceStates: {
      textBased: {
        layers: Object.fromEntries(
          Object.entries(esqlByLayer).map(([layerId, esql]) => [
            layerId,
            { query: { esql }, columns: [] },
          ])
        ),
      },
    },
  },
});

const getContext = (
  esqlByLayer: Record<string, string>,
  surface = 'discover'
): LensXYOverlayMatchContext => {
  const context = getXYOverlayMatchContext({
    attributes: createAttributes(esqlByLayer),
    executionContext: { name: surface },
  });
  if (!context) {
    throw new Error('Expected a match context');
  }
  return context;
};

describe('Lens XY overlay providers', () => {
  describe('registry', () => {
    it('rejects duplicate ids', () => {
      const registry = createXYOverlayProviderRegistry();
      registry.register(createExemplarsOverlayProvider());

      expect(() => registry.register(createExemplarsOverlayProvider())).toThrow(
        'Lens XY overlay provider "observability.exemplars" is already registered'
      );
    });
  });

  describe('getXYOverlayMatchContext', () => {
    it('exposes ES|QL layers by id', () => {
      expect(getContext({ layer1: TS_QUERY }).layers).toEqual([
        { layerId: 'layer1', esql: TS_QUERY },
      ]);
    });

    it('returns undefined without a visualization type', () => {
      expect(
        getXYOverlayMatchContext({ attributes: { visualizationType: null, state: {} } })
      ).toBeUndefined();
    });

    it('returns undefined for charts that cannot render overlays', () => {
      expect(
        getXYOverlayMatchContext({
          attributes: { ...createAttributes({ layer1: TS_QUERY }), visualizationType: 'lnsMetric' },
        })
      ).toBeUndefined();
    });
  });

  describe('resolveActiveProviders', () => {
    const providers = [createExemplarsOverlayProvider()];

    it('activates only on layers matching the rules', () => {
      const context = getContext({ metrics: TS_QUERY, logs: 'FROM logs-* | LIMIT 10' });

      expect(
        resolveActiveProviders({ providers, context }).activeProviders.map(
          ({ layer }) => layer.layerId
        )
      ).toEqual(['metrics']);
    });

    it('respects surface rules', () => {
      const context = getContext({ metrics: TS_QUERY }, 'dashboards');

      expect(resolveActiveProviders({ providers, context })).toEqual({
        activeProviders: [],
        failures: [],
      });
    });

    it('lets the host turn a provider off at runtime', () => {
      const context = getContext({ metrics: TS_QUERY });

      expect(
        resolveActiveProviders({
          providers,
          context,
          runtimeConfig: { 'observability.exemplars': false },
        })
      ).toEqual({ activeProviders: [], failures: [] });
    });

    it('skips a throwing rule and reports it as a failure', () => {
      const throwing = createExemplarsOverlayProvider({
        isApplicable: () => {
          throw new Error('boom');
        },
      });

      expect(
        resolveActiveProviders({ providers: [throwing], context: getContext({ a: TS_QUERY }) })
      ).toEqual({
        activeProviders: [],
        failures: [
          { providerId: 'observability.exemplars', layerId: 'a', error: new Error('boom') },
        ],
      });
    });
  });

  describe('runActiveProviders', () => {
    const layer = { layerId: 'metrics', esql: TS_QUERY };

    const createRunContext = (
      executeEsql: LensXYOverlayFetchContext['executeEsql'],
      abortSignal = new AbortController().signal
    ) => ({
      abortSignal,
      getFetchContext: (fetchLayer: LensXYOverlayLayer): LensXYOverlayFetchContext => ({
        layer: fetchLayer,
        filters: [],
        queries: [],
        abortSignal,
        executeEsql,
      }),
    });

    it('runs the derived query and stamps the owning ids on the overlay', async () => {
      const executeEsql = jest.fn().mockResolvedValue(exemplarsTable);

      const { overlays, failures } = await runActiveProviders({
        activeProviders: [{ provider: createExemplarsOverlayProvider(), layer }],
        ...createRunContext(executeEsql),
      });

      expect(executeEsql).toHaveBeenCalledWith(`SET exemplars={"limit": 500};\n${TS_QUERY}`, {
        title: 'Exemplars',
      });
      expect(failures).toEqual([]);
      expect(overlays).toEqual([
        {
          type: 'points',
          title: 'Exemplars',
          providerId: 'observability.exemplars',
          layerId: 'metrics',
          data: exemplarsTable.rows,
          xAccessor: '@timestamp',
          yAccessor: 'value',
        },
      ]);
      expect(overlays[0].data[0]).toBe(exemplarsTable.rows[0]);
    });

    it('isolates a failing provider from the others', async () => {
      const failing = createExemplarsOverlayProvider({
        id: 'failing',
        fetchOverlay: () => Promise.reject(new Error('no access to exemplars-*')),
      });

      const { overlays, failures } = await runActiveProviders({
        activeProviders: [
          { provider: failing, layer },
          { provider: createExemplarsOverlayProvider(), layer },
        ],
        ...createRunContext(jest.fn().mockResolvedValue(exemplarsTable)),
      });

      expect(overlays.map(({ providerId }) => providerId)).toEqual(['observability.exemplars']);
      expect(failures).toEqual([
        {
          providerId: 'failing',
          layerId: 'metrics',
          error: new Error('no access to exemplars-*'),
        },
      ]);
    });

    it('isolates a provider that throws synchronously or returns no data array', async () => {
      const throwing = createExemplarsOverlayProvider({
        id: 'throwing',
        fetchOverlay: () => {
          throw new Error('sync failure');
        },
      });
      const withoutData = createExemplarsOverlayProvider({
        id: 'withoutData',
        fetchOverlay: async () =>
          ({ type: 'points', title: 'No data' } as Awaited<
            ReturnType<LensXYOverlayProvider['fetchOverlay']>
          >),
      });

      const { overlays, failures } = await runActiveProviders({
        activeProviders: [
          { provider: throwing, layer },
          { provider: withoutData, layer },
          { provider: createExemplarsOverlayProvider(), layer },
        ],
        ...createRunContext(jest.fn().mockResolvedValue(exemplarsTable)),
      });

      expect(overlays.map(({ providerId }) => providerId)).toEqual(['observability.exemplars']);
      expect(failures).toEqual([
        { providerId: 'throwing', layerId: 'metrics', error: new Error('sync failure') },
        {
          providerId: 'withoutData',
          layerId: 'metrics',
          error: new Error('The "withoutData" overlay has no data array'),
        },
      ]);
    });

    it('drops results of an aborted run', async () => {
      const abortController = new AbortController();
      abortController.abort();

      const result = await runActiveProviders({
        activeProviders: [{ provider: createExemplarsOverlayProvider(), layer }],
        ...createRunContext(jest.fn().mockResolvedValue(exemplarsTable), abortController.signal),
      });

      expect(result).toEqual({ overlays: [], failures: [], truncations: [] });
    });

    it('caps the points of an overlay and reports the truncation', async () => {
      const data = Array.from({ length: MAX_XY_OVERLAY_POINTS + 5 }, (_, index) => ({
        x: index,
        y: index,
      }));
      const crowded = createExemplarsOverlayProvider({
        fetchOverlay: async () => ({
          type: 'points',
          title: 'Crowded',
          data,
          xAccessor: 'x',
          yAccessor: 'y',
        }),
      });

      const { overlays, truncations } = await runActiveProviders({
        activeProviders: [{ provider: crowded, layer }],
        ...createRunContext(jest.fn()),
      });

      expect(overlays[0].data).toHaveLength(MAX_XY_OVERLAY_POINTS);
      expect(truncations).toEqual([
        {
          providerId: 'observability.exemplars',
          layerId: 'metrics',
          pointCount: MAX_XY_OVERLAY_POINTS + 5,
        },
      ]);
    });
  });

  describe('dispatchOverlayPointClick', () => {
    it('routes the click to the owning provider', () => {
      const onPointClick = jest.fn();
      const registry = createXYOverlayProviderRegistry();
      registry.register(createExemplarsOverlayProvider({ onPointClick }));
      const event = {
        providerId: 'observability.exemplars',
        layerId: 'metrics',
        datum: exemplarsTable.rows[0],
      };

      dispatchOverlayPointClick(registry, event);

      expect(onPointClick).toHaveBeenCalledWith(event);
    });
  });
});
