/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, of } from 'rxjs';
import type { AggConfigSerialized, AggsStart } from '@kbn/data-plugin/common';
import { AggConfigs, SearchSourceService, calculateBounds } from '@kbn/data-plugin/common';
import {
  mockAggTypesDependencies,
  mockAggTypesRegistry,
} from '@kbn/data-plugin/common/search/aggs/test_helpers';
import type { DataView, DataViewSpec, DataViewsContract } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { Filter } from '@kbn/es-query';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
import type { KitServices } from '../kit/create_kit';
import { createTestKitServices } from '../kit/kit_services.mock';
import type { AggsDataRequest } from '../types';
import type { AggsServices } from './aggs';
import { executeAggs } from './aggs';
import { DataRequestTimeoutError } from './esql';

const timeRange = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' };
const phraseFilter: Filter = {
  meta: { alias: null, disabled: false, negate: false },
  query: { match_phrase: { 'machine.os': 'ios' } },
};

const spec: DataViewSpec = {
  id: 'logs',
  title: 'logstash-*',
  timeFieldName: '@timestamp',
  fields: {
    '@timestamp': {
      name: '@timestamp',
      type: 'date',
      esTypes: ['date'],
      aggregatable: true,
      searchable: true,
    },
    'event.created': {
      name: 'event.created',
      type: 'date',
      esTypes: ['date'],
      aggregatable: true,
      searchable: true,
    },
    'machine.os': {
      name: 'machine.os',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      searchable: true,
    },
    bytes: {
      name: 'bytes',
      type: 'number',
      esTypes: ['long'],
      aggregatable: true,
      searchable: true,
    },
  },
};

// `histogram:barTarget` 25 over one day: Kibana's calc_auto_interval test gives one-hour buckets.
const uiSettings: Record<string, unknown> = {
  'histogram:maxBars': 100,
  'histogram:barTarget': 25,
  'dateFormat:tz': 'UTC',
  'query:allowLeadingWildcards': true,
  'query:queryString:options': {},
  'courier:ignoreFilterIfFieldNotInIndex': false,
};
const getConfig = <T>(key: string): T =>
  (key in uiSettings
    ? uiSettings[key]
    : (mockAggTypesDependencies.getConfig as (key: string) => unknown)(key)) as T;

let kitServices: KitServices;
beforeAll(async () => {
  kitServices = await createTestKitServices();
});

/** A search that never answers, and fails once its request is aborted, as Kibana's search does. */
const pendingSearch = () =>
  jest.fn(
    (_request: unknown, options: { abortSignal?: AbortSignal }) =>
      new Observable((subscriber) => {
        options.abortSignal?.addEventListener('abort', () =>
          subscriber.error(new Error('aborted'))
        );
      })
  );

const termsResponse = {
  hits: { total: 30, max_score: 0, hits: [] },
  aggregations: {
    '1': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        { key: 'ios', doc_count: 20 },
        { key: 'win', doc_count: 10 },
      ],
    },
  },
};

const termsAggs: AggConfigSerialized[] = [
  { id: '1', type: 'terms', schema: 'segment', params: { field: 'machine.os', size: 5 } },
  { id: '2', type: 'count', schema: 'metric' },
];

/**
 * Kibana's own agg types, agg configs and search source over a fake search, so the request and
 * table are the ones Kibana's `esaggs` builds.
 */
const setup = ({
  response = termsResponse as object,
  search: searchOverride,
}: { response?: object; search?: jest.Mock } = {}) => {
  const typesRegistry = mockAggTypesRegistry({
    ...mockAggTypesDependencies,
    getConfig,
    calculateBounds: (range) => calculateBounds(range),
  });
  const dataView: DataView = createStubDataView({
    spec,
    deps: { fieldFormats: kitServices.registry },
  });
  const createAggConfigs = jest.fn<
    AggConfigs,
    Parameters<AggsServices['aggs']['createAggConfigs']>
  >(
    (indexPattern, configStates, options) =>
      new AggConfigs(indexPattern, configStates, { ...options, typesRegistry }, jest.fn())
  );
  const search =
    searchOverride ??
    jest.fn<ReturnType<ISearchGeneric>, Parameters<ISearchGeneric>>(() =>
      of({ rawResponse: response })
    );
  const dataViews = {
    get: jest.fn(async () => dataView),
    create: jest.fn(async () => dataView),
  };
  const searchSource = new SearchSourceService().start(dataViews as unknown as DataViewsContract, {
    aggs: { createAggConfigs } as unknown as AggsStart,
    getConfig,
    search: search as unknown as ISearchGeneric,
    onResponse: (_request, result) => result,
    dataViews: dataViews as unknown as DataViewsContract,
    scriptedFieldsEnabled: true,
  });
  const services: AggsServices = { dataViews, aggs: { createAggConfigs }, searchSource };
  const getRequestBody = (call = 0) => search.mock.calls[call][0].params.body;
  return { services, search, dataViews, dataView, createAggConfigs, getRequestBody };
};

const deps = (
  services: AggsServices,
  { abortSignal = new AbortController().signal, maxRows = 3, timeoutMs = 30_000 } = {}
) => ({ getServices: async () => services, abortSignal, maxRows, timeoutMs });

const request = (overrides: Partial<AggsDataRequest> = {}): AggsDataRequest => ({
  kind: 'aggs',
  dataView: 'logs',
  aggs: termsAggs,
  ...overrides,
});

describe('executeAggs', () => {
  it("runs the aggs with the context's time range, filters and query, as esaggs does", async () => {
    const { services, getRequestBody, dataViews, dataView } = setup();

    await executeAggs(
      request(),
      {
        timeRange,
        filters: [phraseFilter],
        query: { language: 'kuery', query: 'bytes > 1000' },
      },
      0,
      deps(services)
    );

    expect(dataViews.get).toHaveBeenCalledWith('logs', false);
    const body = getRequestBody();
    expect(body.size).toBe(0);
    // Kibana's terms tests: a size of 10 or less gets a shard size of 25.
    expect(body.aggs['1'].terms).toEqual(
      expect.objectContaining({ field: 'machine.os', size: 5, shard_size: 25 })
    );
    // The time filter `getTime` builds on the data view's time field, per Kibana's get_time tests.
    expect(body.query.bool.filter).toEqual(
      expect.arrayContaining([
        {
          range: {
            '@timestamp': {
              gte: timeRange.from,
              lte: timeRange.to,
              format: 'strict_date_optional_time',
            },
          },
        },
        { match_phrase: { 'machine.os': 'ios' } },
      ])
    );
    expect(body.query.bool.filter).toContainEqual(
      toElasticsearchQuery(fromKueryExpression('bytes > 1000'), dataView)
    );
  });

  it("tabifies the response into esaggs' Datatable", async () => {
    const { services } = setup();

    const { table, losses } = await executeAggs(request(), { timeRange }, 0, deps(services));

    expect(losses).toEqual([]);
    expect(table.type).toBe('datatable');
    expect(table.meta).toEqual({
      type: 'esaggs',
      source: 'logs',
      statistics: { totalCount: 30 },
    });
    expect(table.columns.map(({ id, meta }) => [id, meta.type, meta.field, meta.source])).toEqual([
      ['col-0-1', 'string', 'machine.os', 'esaggs'],
      ['col-1-2', 'number', undefined, 'esaggs'],
    ]);
    expect(table.columns[0].meta.sourceParams).toEqual(
      expect.objectContaining({ indexPatternId: 'logs', type: 'terms', id: '1' })
    );
    expect(table.rows).toEqual([
      { 'col-0-1': 'ios', 'col-1-2': 20 },
      { 'col-0-1': 'win', 'col-1-2': 10 },
    ]);
  });

  it('filters the time range on the given time fields in place of the data view’s', async () => {
    const { services, getRequestBody } = setup();

    await executeAggs(request({ timeFields: ['event.created'] }), { timeRange }, 0, deps(services));

    expect(JSON.stringify(getRequestBody().query)).toContain('"event.created":{');
    expect(JSON.stringify(getRequestBody().query)).not.toContain('"@timestamp":{');
  });

  it('creates an ad hoc data view from its spec', async () => {
    const { services, dataViews } = setup();

    await executeAggs(request({ dataView: spec }), {}, 0, deps(services));

    expect(dataViews.create).toHaveBeenCalledWith(spec, false, false);
    expect(dataViews.get).not.toHaveBeenCalled();
  });

  it('passes esaggs options through to the agg configs', async () => {
    const { services, createAggConfigs, getRequestBody } = setup({
      response: { ...termsResponse, aggregations: { sampling: termsResponse.aggregations } },
    });

    const { table } = await executeAggs(
      request({ metricsAtAllLevels: true, partialRows: true, probability: 0.5, samplerSeed: 7 }),
      {},
      0,
      deps(services)
    );

    expect(createAggConfigs).toHaveBeenCalledWith(expect.anything(), termsAggs, {
      hierarchical: true,
      partialRows: true,
      probability: 0.5,
      samplerSeed: 7,
    });
    // A sampled request nests the aggs under `sampling`, per Kibana's agg_configs tests.
    expect(Object.keys(getRequestBody().aggs.sampling)).toEqual(['random_sampler', 'aggs']);
    expect(table.rows).toHaveLength(2);
  });

  it('defaults to the options Lens runs esaggs with', async () => {
    const { services, createAggConfigs } = setup();

    await executeAggs(request(), {}, 0, deps(services));

    expect(createAggConfigs).toHaveBeenCalledWith(expect.anything(), termsAggs, {
      hierarchical: false,
      partialRows: false,
      probability: undefined,
      samplerSeed: undefined,
    });
  });

  describe('date histograms', () => {
    const histogramAggs: AggConfigSerialized[] = [
      {
        id: '1',
        type: 'date_histogram',
        schema: 'segment',
        params: { field: '@timestamp', interval: 'auto' },
      },
      { id: '2', type: 'count', schema: 'metric' },
    ];
    const histogramResponse = {
      hits: { total: 3, max_score: 0, hits: [] },
      aggregations: {
        '1': {
          buckets: [
            { key: 1767225600000, key_as_string: '2026-01-01T00:00:00.000Z', doc_count: 3 },
          ],
        },
      },
    };

    it('resolves an auto interval from the time range and the user’s bar target', async () => {
      const { services, getRequestBody } = setup({ response: histogramResponse });

      const { table } = await executeAggs(
        request({ aggs: histogramAggs }),
        { timeRange },
        0,
        deps(services)
      );

      // One day at 25 bars is one-hour buckets, which dateHistogramInterval sends as a calendar interval.
      expect(getRequestBody().aggs['1'].date_histogram).toEqual(
        expect.objectContaining({ calendar_interval: '1h', time_zone: 'UTC' })
      );
      expect(table.rows).toEqual([{ 'col-0-1': 1767225600000, 'col-1-2': 3 }]);
    });

    it("buckets in the context's time zone unless the agg sets its own", async () => {
      const { services, getRequestBody } = setup({ response: histogramResponse });
      const ownTimeZone: AggConfigSerialized = {
        id: '3',
        type: 'date_histogram',
        schema: 'segment',
        params: { field: '@timestamp', interval: '1d', time_zone: 'Asia/Tokyo' },
      };

      await executeAggs(
        request({ aggs: [...histogramAggs, ownTimeZone] }),
        { timeRange, timeZone: 'Europe/Paris' },
        0,
        deps(services)
      );

      const { aggs } = getRequestBody();
      expect(aggs['1'].date_histogram.time_zone).toBe('Europe/Paris');
      expect(aggs['1'].aggs['3'].date_histogram.time_zone).toBe('Asia/Tokyo');
    });
  });

  it('caps the rows, recording the drop', async () => {
    const { services } = setup();

    const { table, losses } = await executeAggs(
      request({ maxRows: 1 }),
      {},
      2,
      deps(services, { maxRows: 3 })
    );

    expect(table.rows).toEqual([{ 'col-0-1': 'ios', 'col-1-2': 20 }]);
    expect(losses).toEqual([
      {
        path: 'data.rows',
        kind: 'dropped',
        note: 'Kept the first 1 rows of data request 2; its query returned more.',
      },
    ]);
  });

  it('raises a timeout error when the search runs past its timeout', async () => {
    const { services, search } = setup({ search: pendingSearch() });

    await expect(executeAggs(request(), {}, 0, deps(services, { timeoutMs: 10 }))).rejects.toThrow(
      new DataRequestTimeoutError(10)
    );
    expect(search.mock.calls[0][1].abortSignal.aborted).toBe(true);
  });

  it("passes the caller's abort through as is", async () => {
    const { services, search } = setup({ search: pendingSearch() });
    const controller = new AbortController();

    const run = executeAggs(request(), {}, 0, deps(services, { abortSignal: controller.signal }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();

    await expect(run).rejects.toThrow('aborted');
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('rejects when the data view cannot be loaded', async () => {
    const { services, dataViews } = setup();
    dataViews.get.mockRejectedValueOnce(new Error('Could not locate that data view (id: nope)'));

    await expect(executeAggs(request({ dataView: 'nope' }), {}, 0, deps(services))).rejects.toThrow(
      'Could not locate that data view (id: nope)'
    );
  });
});
