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
  type LensExtension,
  type LensExtensionFetchContext,
  type LensExtensionLayer,
  type LensExtensionMatchContext,
} from '@kbn/lens-common';
import {
  createLensExtensionRegistry,
  dispatchOverlayPointClick,
  getExtensionMatchContext,
  resolveActiveExtensions,
  runActiveExtensions,
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

const createExemplarsExtension = (overrides: Partial<LensExtension> = {}): LensExtension => ({
  id: 'observability.exemplars',
  visualizationTypes: ['lnsXY'],
  isApplicable: ({ executionContext }, { esql }) =>
    executionContext?.name === 'discover' &&
    esql !== undefined &&
    queryHasTsSourceCommand(esql) &&
    queryHasStatsCommand(esql),
  fetchOverlay: async ({ layer, executeEsql }) => {
    const { rows } = await executeEsql(`SET exemplars={"limit": 500};\n${layer.esql}`);
    return {
      type: 'points',
      title: 'Exemplars',
      points: rows.map((row) => ({
        id: String(row.trace_id),
        x: Number(row['@timestamp']),
        y: Number(row.value),
      })),
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
): LensExtensionMatchContext => {
  const context = getExtensionMatchContext({
    attributes: createAttributes(esqlByLayer),
    executionContext: { name: surface },
  });
  if (!context) {
    throw new Error('Expected a match context');
  }
  return context;
};

describe('Lens extensions', () => {
  describe('registry', () => {
    it('rejects duplicate ids', () => {
      const registry = createLensExtensionRegistry();
      registry.register(createExemplarsExtension());

      expect(() => registry.register(createExemplarsExtension())).toThrow(
        'Lens extension "observability.exemplars" is already registered'
      );
    });
  });

  describe('getExtensionMatchContext', () => {
    it('exposes ES|QL layers by id', () => {
      expect(getContext({ layer1: TS_QUERY }).layers).toEqual([
        { layerId: 'layer1', esql: TS_QUERY },
      ]);
    });

    it('returns undefined without a visualization type', () => {
      expect(
        getExtensionMatchContext({ attributes: { visualizationType: null, state: {} } })
      ).toBeUndefined();
    });
  });

  describe('resolveActiveExtensions', () => {
    const extensions = [createExemplarsExtension()];

    it('activates only on layers matching the rules', () => {
      const context = getContext({ metrics: TS_QUERY, logs: 'FROM logs-* | LIMIT 10' });

      expect(
        resolveActiveExtensions({ extensions, context }).map(({ layer }) => layer.layerId)
      ).toEqual(['metrics']);
    });

    it('respects surface rules', () => {
      const context = getContext({ metrics: TS_QUERY }, 'dashboards');

      expect(resolveActiveExtensions({ extensions, context })).toEqual([]);
    });

    it('lets the host turn an extension off at runtime', () => {
      const context = getContext({ metrics: TS_QUERY });

      expect(
        resolveActiveExtensions({
          extensions,
          context,
          runtimeConfig: { 'observability.exemplars': false },
        })
      ).toEqual([]);
    });

    it('treats a throwing rule as not applicable', () => {
      const throwing = createExemplarsExtension({
        isApplicable: () => {
          throw new Error('boom');
        },
      });

      expect(
        resolveActiveExtensions({ extensions: [throwing], context: getContext({ a: TS_QUERY }) })
      ).toEqual([]);
    });
  });

  describe('runActiveExtensions', () => {
    const layer = { layerId: 'metrics', esql: TS_QUERY };

    const createRunContext = (
      executeEsql: LensExtensionFetchContext['executeEsql'],
      abortSignal = new AbortController().signal
    ) => ({
      abortSignal,
      getFetchContext: (fetchLayer: LensExtensionLayer): LensExtensionFetchContext => ({
        layer: fetchLayer,
        abortSignal,
        executeEsql,
      }),
    });

    it('runs the derived query and stamps the owning ids on the overlay', async () => {
      const executeEsql = jest.fn().mockResolvedValue(exemplarsTable);

      const { overlays, failures } = await runActiveExtensions({
        activeExtensions: [{ extension: createExemplarsExtension(), layer }],
        ...createRunContext(executeEsql),
      });

      expect(executeEsql).toHaveBeenCalledWith(`SET exemplars={"limit": 500};\n${TS_QUERY}`);
      expect(failures).toEqual([]);
      expect(overlays).toEqual([
        {
          type: 'points',
          title: 'Exemplars',
          extensionId: 'observability.exemplars',
          layerId: 'metrics',
          points: [{ id: 'abc', x: 1000, y: 42 }],
        },
      ]);
    });

    it('isolates a failing extension from the others', async () => {
      const failing = createExemplarsExtension({
        id: 'failing',
        fetchOverlay: () => Promise.reject(new Error('no access to exemplars-*')),
      });

      const { overlays, failures } = await runActiveExtensions({
        activeExtensions: [
          { extension: failing, layer },
          { extension: createExemplarsExtension(), layer },
        ],
        ...createRunContext(jest.fn().mockResolvedValue(exemplarsTable)),
      });

      expect(overlays.map(({ extensionId }) => extensionId)).toEqual(['observability.exemplars']);
      expect(failures).toEqual([
        {
          extensionId: 'failing',
          layerId: 'metrics',
          error: new Error('no access to exemplars-*'),
        },
      ]);
    });

    it('drops results of an aborted run', async () => {
      const abortController = new AbortController();
      abortController.abort();

      const result = await runActiveExtensions({
        activeExtensions: [{ extension: createExemplarsExtension(), layer }],
        ...createRunContext(jest.fn().mockResolvedValue(exemplarsTable), abortController.signal),
      });

      expect(result).toEqual({ overlays: [], failures: [] });
    });
  });

  describe('dispatchOverlayPointClick', () => {
    it('routes the click to the owning extension', () => {
      const onPointClick = jest.fn();
      const registry = createLensExtensionRegistry();
      registry.register(createExemplarsExtension({ onPointClick }));
      const event = { extensionId: 'observability.exemplars', layerId: 'metrics', pointId: 'abc' };

      dispatchOverlayPointClick(registry, event);

      expect(onPointClick).toHaveBeenCalledWith(event);
    });
  });
});
