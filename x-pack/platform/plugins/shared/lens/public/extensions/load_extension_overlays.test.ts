/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { LensExtension, LensRuntimeState } from '@kbn/lens-common';
import { createLensExtensionRegistry } from './extension_registry';
import { loadExtensionOverlays } from './load_extension_overlays';

const ESQL = 'TS metrics-* | STATS AVG(http.server.request.duration) BY TBUCKET(1m)';
const TIME_RANGE = { from: 'now-15m', to: 'now' };
const FILTERS: Filter[] = [{ meta: {}, query: { match_all: {} } }];
const KQL = { language: 'kuery', query: 'service.name : "api"' };

const datatable: Datatable = {
  type: 'datatable',
  columns: [],
  rows: [{ '@timestamp': '2026-11-10T10:00:00.000Z', value: 42 }],
};

const createAttributes = (ignoreGlobalFilters: boolean) =>
  ({
    visualizationType: 'lnsXY',
    state: {
      datasourceStates: {
        textBased: {
          layers: {
            layer1: {
              query: { esql: ESQL },
              columns: [],
              timeField: '@timestamp',
              ignoreGlobalFilters,
            },
          },
        },
      },
    },
  } as unknown as LensRuntimeState['attributes']);

const extension: LensExtension = {
  id: 'test.exemplars',
  visualizationTypes: ['lnsXY'],
  isApplicable: () => true,
  fetchOverlay: async ({ executeEsql }) => {
    const { rows } = await executeEsql('SET exemplars=true;', { title: 'Exemplars' });
    return {
      type: 'points',
      title: 'Exemplars',
      points: rows.map(() => ({ id: 'a', x: 1, y: 2 })),
    };
  },
};

const load = async (ignoreGlobalFilters: boolean) => {
  const esql = jest.fn().mockResolvedValue({ datatable });
  const registry = createLensExtensionRegistry();
  registry.register(extension);
  const requestsAdapter = new RequestAdapter();

  const result = await loadExtensionOverlays({
    registry,
    attributes: createAttributes(ignoreGlobalFilters),
    searchContext: {
      timeRange: TIME_RANGE,
      filters: FILTERS,
      query: [KQL],
      esqlVariables: [],
      isApproximate: false,
    },
    searchSessionId: 'session-1',
    requestsAdapter,
    abortSignal: new AbortController().signal,
    data: { search: { esql } } as unknown as DataPublicPluginStart,
  });

  return { esql, result, requestsAdapter };
};

describe('loadExtensionOverlays', () => {
  it('runs extension queries with the chart search scope, session and inspector', async () => {
    const { esql, result, requestsAdapter } = await load(false);

    expect(esql).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'SET exemplars=true;',
        kibanaQueryContext: {
          timeRange: TIME_RANGE,
          timeField: '@timestamp',
          kibanaFilters: FILTERS,
          kqlQuery: [KQL],
          esqlVariables: [],
        },
        dropNullColumns: true,
      }),
      expect.objectContaining({
        sessionId: 'session-1',
        includeDataTable: true,
        inspector: expect.objectContaining({ adapter: requestsAdapter, title: 'Exemplars' }),
      })
    );
    expect(result.overlays).toHaveLength(1);
  });

  it('drops dashboard filters and query when the layer ignores global filters', async () => {
    const { esql } = await load(true);

    expect(esql).toHaveBeenCalledWith(
      expect.objectContaining({
        kibanaQueryContext: expect.objectContaining({ kibanaFilters: [], kqlQuery: undefined }),
      }),
      expect.anything()
    );
  });
});
