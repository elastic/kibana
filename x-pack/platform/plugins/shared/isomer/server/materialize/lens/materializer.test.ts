/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { MetricNode, UnsupportedNode } from '@kbn/isomer';
import { createMaterializeKit } from '../kit/create_kit';
import { createTestKitServices } from '../kit/kit_services.mock';
import { runPipeline } from '../pipeline';
import type { EsqlDataRequest, MaterializeScope } from '../types';
import { createNodeValidator } from '../validate_node';
import { corpusCases } from './__fixtures__/corpus_cases';
import { corpusTable } from './__fixtures__/esql_table';
import type { LensTransformOut } from './materializer';
import { LENS_TYPE, createLensMaterializer } from './materializer';

const transformOut = jest.fn<ReturnType<LensTransformOut>, Parameters<LensTransformOut>>();
const materializer = createLensMaterializer({
  getTransformOut: () => transformOut,
  basePath: { get: () => '/base/s/team' },
});

const scope = (): MaterializeScope => {
  const savedObjectsClient = savedObjectsClientMock.create();
  savedObjectsClient.get.mockResolvedValue({
    id: 'chart-1',
    type: LENS_TYPE,
    attributes: { title: 'Saved', visualizationType: 'lnsMetric', state: {} },
    references: [{ id: 'dv', name: 'ref', type: 'index-pattern' }],
  });
  return {
    request: httpServerMock.createKibanaRequest(),
    savedObjectsClient,
    abortSignal: new AbortController().signal,
  };
};

const esqlMetric = {
  type: 'metric',
  title: 'Visits',
  data_source: { type: 'esql', query: 'FROM logs | WHERE @timestamp >= ?_tstart | STATS COUNT(*)' },
  metrics: [{ type: 'primary', column: 'COUNT(*)' }],
};

describe('Lens materializer: parse', () => {
  it("reads a config in Lens's API format, with Lens's defaults filled in", () => {
    const { chart, savedObject } = materializer.parse(corpusCases.logsVisits.config);
    expect(chart).toMatchObject({ type: 'metric', sampling: 1, ignore_global_filters: false });
    expect(savedObject).toBeUndefined();
  });

  it('refuses anything else with the first problem', () => {
    expect(() => materializer.parse({ type: 'metric', metrics: [] })).toThrow(
      /It is not a chart in Lens API format/
    );
  });
});

describe('Lens materializer: load', () => {
  beforeEach(() => transformOut.mockReset());

  it("loads the saved object through Lens's transformOut, keeping where it came from", async () => {
    transformOut.mockReturnValue(esqlMetric);
    const loadScope = scope();
    const loaded = await materializer.load!('chart-1', loadScope);

    expect(loadScope.savedObjectsClient.get).toHaveBeenCalledWith('lens', 'chart-1');
    expect(transformOut).toHaveBeenCalledWith(
      {
        attributes: {
          title: 'Saved',
          visualizationType: 'lnsMetric',
          state: {},
          references: [{ id: 'dv', name: 'ref', type: 'index-pattern' }],
        },
      },
      [{ id: 'dv', name: 'ref', type: 'index-pattern' }]
    );
    const parsed = materializer.parse(loaded);
    expect(parsed.savedObject).toEqual({
      id: 'chart-1',
      path: '/base/s/team/app/lens#/edit/chart-1',
    });
    expect(materializer.describe!(parsed)).toEqual({
      title: 'Visits',
      link: { href: '/base/s/team/app/lens#/edit/chart-1', label: 'Open in Lens' },
    });
  });

  it('does not take a saved object reference from a by-value config', () => {
    const forged = { ...esqlMetric, savedObject: { id: 'x', path: '/forged' } };
    expect(materializer.parse(forged).savedObject).toBeUndefined();
  });

  it('fails without Lens', async () => {
    const withoutLens = createLensMaterializer({
      getTransformOut: () => undefined,
      basePath: { get: () => '' },
    });
    await expect(withoutLens.load!('chart-1', scope())).rejects.toThrow(
      'Lens is not available in this Kibana.'
    );
  });
});

describe('Lens materializer: plan', () => {
  const plan = (config: unknown) => materializer.plan(materializer.parse(config), {});

  it('runs the ES|QL query with the time field it filters on', () => {
    expect(plan(esqlMetric)).toEqual([
      { kind: 'esql', query: esqlMetric.data_source.query, timeField: '@timestamp' },
    ]);
  });

  it("applies the panel's filters and a layer's choice to ignore the global ones", () => {
    const [request] = plan({
      ...esqlMetric,
      ignore_global_filters: true,
      filters: [
        { type: 'condition', condition: { field: 'host', operator: 'is', value: 'web-01' } },
      ],
    }) as EsqlDataRequest[];
    expect(request.context?.ignoreGlobalFilters).toBe(true);
    expect(request.context?.filters).toEqual([
      expect.objectContaining({ query: { match_phrase: { host: 'web-01' } } }),
    ]);
  });

  it('runs one query per xy layer that reads data, in layer order', () => {
    const requests = plan({
      type: 'xy',
      layers: [
        { type: 'bar', data_source: { type: 'esql', query: 'FROM a' }, y: [{ column: 'x' }] },
        {
          type: 'annotations',
          events: [{ type: 'point', timestamp: 1 }],
        },
        {
          type: 'reference_lines',
          data_source: { type: 'esql', query: 'FROM b' },
          thresholds: [{ column: 'y' }],
        },
      ],
    }) as EsqlDataRequest[];
    expect(requests.map(({ query }) => query)).toEqual(['FROM a', 'FROM b']);
  });

  it.each([
    [
      'a chart type it does not map',
      {
        type: 'tag_cloud',
        data_source: { type: 'esql', query: 'FROM a' },
        metric: { column: 'c' },
        tag_by: { column: 't' },
      },
      'Lens "tag_cloud" charts cannot be materialized yet.',
    ],
    [
      'a data view metric',
      corpusCases.longMetricDataView.config,
      'Lens charts that query a data view cannot be materialized yet; only ES|QL charts can.',
    ],
  ])('is unsupported for %s, with the reason', (_, config, reason) => {
    expect((plan(config) as UnsupportedNode).reason).toBe(reason);
  });
});

describe('Lens materializer: through the pipeline', () => {
  it('materializes a saved ES|QL metric into a node that validates', async () => {
    const services = await createTestKitServices();
    transformOut.mockReturnValue(corpusCases.logsVisits.config);
    const config = materializer.parse(await materializer.load!('chart-1', scope()));
    const node = await runPipeline(
      {
        type: LENS_TYPE,
        materializer,
        config,
        context: {
          timeRange: { from: '2026-11-04T00:00:00.000Z', to: '2026-11-04T06:00:00.000Z' },
        },
        savedObjectId: 'chart-1',
      },
      {
        executeEsql: async () => ({ table: corpusTable('logsVisits'), losses: [] }),
        materialize: async () => {
          throw new Error('Not nested.');
        },
        getTimeZone: async () => 'UTC',
        createKit: async (context) => createMaterializeKit(services, context),
        validate: createNodeValidator(),
        kibanaVersion: '9.7.0',
        now: () => new Date('2026-11-04T06:00:00.000Z'),
      }
    );
    const metric = node as MetricNode;
    expect(metric.type).toBe('metric');
    expect(metric.source).toMatchObject({
      host: 'kibana',
      meta: { materializer: 'lens', savedObjectId: 'chart-1' },
    });
    expect(metric.interactions?.link?.href).toMatch(
      /^\/base\/s\/team\/app\/lens#\/edit\/chart-1\?_g=/
    );
  });
});
