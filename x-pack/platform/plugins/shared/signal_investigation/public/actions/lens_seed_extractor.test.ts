/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { buildPhraseFilter, type Filter } from '@kbn/es-query';
import type { ChartInfo, LensApi, LensPublicStart } from '@kbn/lens-plugin/public';
import { extractLensChartSeed, readChartInfoMetadata } from './lens_seed_extractor';

const xyChartInfo = (overrides: Partial<ChartInfo> = {}): ChartInfo => ({
  visualizationType: 'lnsXY',
  filters: [],
  query: { language: 'kuery', query: '' },
  layers: [
    {
      layerId: 'layer-1',
      layerType: 'data',
      dataView: { id: 'logs-view', title: 'logs-*' } as never,
      dimensions: [
        {
          id: 'metric-1',
          name: 'Count of records',
          role: 'metric',
          dimensionType: 'y',
          operation: {
            type: 'count',
            label: 'Count of records',
            dataType: 'number',
            isBucketed: false,
            scale: 'ratio',
            hasTimeShift: false,
            hasReducedTimeRange: false,
          },
        },
        {
          id: 'split-1',
          name: 'Top services',
          role: 'split',
          dimensionType: 'breakdown',
          operation: {
            type: 'terms',
            label: 'Top services',
            fields: ['service.name'],
            dataType: 'string',
            isBucketed: true,
            scale: 'ordinal',
            hasTimeShift: false,
            hasReducedTimeRange: false,
          },
        },
      ],
    },
  ],
  ...overrides,
});

describe('readChartInfoMetadata', () => {
  it('reads single metric, multiple metrics up to 10, and the breakdown split field', () => {
    const single = readChartInfoMetadata(xyChartInfo());
    expect(single.metricUnreadable).toBe(false);
    expect(single.metrics).toEqual([
      { id: 'metric-1', label: 'Count of records', operationType: 'count' },
    ]);
    expect(single.splitField).toBe('service.name');
    expect(single.dataViewId).toBe('logs-view');
    expect(single.indexPattern).toBe('logs-*');

    const multi = readChartInfoMetadata(
      xyChartInfo({
        layers: [
          {
            layerId: 'layer-1',
            layerType: 'data',
            dataView: { id: 'metrics-view', title: 'metrics-*' } as never,
            dimensions: Array.from({ length: 12 }, (_, idx) => ({
              id: `m-${idx}`,
              name: `Metric ${idx}`,
              role: 'metric' as const,
              dimensionType: 'y',
              operation: {
                type: 'average',
                label: `Metric ${idx}`,
                fields: [`system.metric.${idx}`],
                dataType: 'number' as const,
                isBucketed: false,
                scale: 'ratio' as const,
                hasTimeShift: false,
                hasReducedTimeRange: false,
              },
            })),
          },
        ],
      })
    );
    expect(multi.metrics).toHaveLength(10);
    expect(multi.metrics[0]).toEqual({
      id: 'm-0',
      label: 'Metric 0',
      operationType: 'avg',
      field: 'system.metric.0',
    });
  });

  it('marks non-XY and ES|QL charts as metricUnreadable without a metric', () => {
    const pie = readChartInfoMetadata(xyChartInfo({ visualizationType: 'lnsPie' }));
    expect(pie.metricUnreadable).toBe(true);
    expect(pie.metrics).toEqual([]);

    const esql = readChartInfoMetadata(
      xyChartInfo({ query: { esql: 'FROM logs-* | STATS count()' } })
    );
    expect(esql.metricUnreadable).toBe(true);
    expect(esql.metrics).toEqual([]);
  });

  it('uses the breakdown field and data-layer metrics, skipping the time axis and reference lines', () => {
    const metadata = readChartInfoMetadata(
      xyChartInfo({
        layers: [
          {
            layerId: 'reference',
            layerType: 'referenceLine',
            dataView: { id: 'reference-view', title: 'reference-*' } as never,
            dimensions: [
              {
                id: 'ref-1',
                name: 'Static value',
                role: 'metric',
                dimensionType: 'reference_line',
                operation: {
                  type: 'static_value',
                  label: 'Static value',
                  fields: ['ignored'],
                  dataType: 'number',
                  isBucketed: false,
                  scale: 'ratio',
                  hasTimeShift: false,
                  hasReducedTimeRange: false,
                },
              },
            ],
          },
          {
            layerId: 'data',
            layerType: 'data',
            dataView: { id: 'metrics-view', title: 'metrics-*' } as never,
            dimensions: [
              {
                id: 'x-1',
                name: '@timestamp',
                role: 'split',
                dimensionType: 'x',
                operation: {
                  type: 'date_histogram',
                  label: '@timestamp',
                  fields: ['@timestamp'],
                  dataType: 'date',
                  isBucketed: true,
                  scale: 'interval',
                  hasTimeShift: false,
                  hasReducedTimeRange: false,
                },
              },
              {
                id: 'y-1',
                name: 'Average latency',
                role: 'metric',
                dimensionType: 'y',
                operation: {
                  type: 'average',
                  label: 'Average latency',
                  fields: ['transaction.duration'],
                  dataType: 'number',
                  isBucketed: false,
                  scale: 'ratio',
                  hasTimeShift: false,
                  hasReducedTimeRange: false,
                },
              },
              {
                id: 'breakdown-1',
                name: 'Host',
                role: 'split',
                dimensionType: 'breakdown',
                operation: {
                  type: 'terms',
                  label: 'Host',
                  fields: ['host.name'],
                  dataType: 'string',
                  isBucketed: true,
                  scale: 'ordinal',
                  hasTimeShift: false,
                  hasReducedTimeRange: false,
                },
              },
            ],
          },
        ],
      })
    );

    expect(metadata.splitField).toBe('host.name');
    expect(metadata.dataViewId).toBe('metrics-view');
    expect(metadata.indexPattern).toBe('metrics-*');
    expect(metadata.metrics).toEqual([
      {
        id: 'y-1',
        label: 'Average latency',
        operationType: 'avg',
        field: 'transaction.duration',
      },
    ]);
  });
});

describe('extractLensChartSeed', () => {
  const indexPattern = { id: 'logs-view', title: 'logs-*' };

  const makeLens = (chartInfo: ChartInfo | undefined): LensPublicStart =>
    ({
      stateHelperApi: async () => ({
        chartInfo: Promise.resolve({
          getChartInfo: async () => chartInfo,
        }),
      }),
    } as unknown as LensPublicStart);

  it('builds a Discover histogram seed when there is no dashboard parent', async () => {
    const clickedFilter: Filter = buildPhraseFilter(
      { name: 'service.name', type: 'string' },
      'checkout',
      indexPattern
    );
    const embeddable = {
      type: 'lens',
      getSavedVis: () => ({}),
      timeRange$: new BehaviorSubject({
        from: '2026-11-02T11:00:00.000Z',
        to: '2026-11-02T12:00:00.000Z',
      }),
      filters$: new BehaviorSubject<Filter[]>([]),
      query$: new BehaviorSubject({ language: 'kuery', query: 'host.name : "web-1"' }),
      dataSources$: new BehaviorSubject([{ id: 'logs-view', title: 'logs-*' }]),
    } as unknown as LensApi;

    const extracted = await extractLensChartSeed({
      embeddable,
      lens: makeLens(xyChartInfo()),
      origin: { app: 'discover', surface: 'histogram' },
      eventTimeRange: {
        from: '2026-11-02T11:10:00.000Z',
        to: '2026-11-02T11:20:00.000Z',
      },
      eventFilters: [clickedFilter],
    });

    expect(extracted?.seed).toMatchObject({
      origin: { app: 'discover', surface: 'histogram' },
      timeRange: {
        from: '2026-11-02T11:10:00.000Z',
        to: '2026-11-02T11:20:00.000Z',
      },
      dataViewId: 'logs-view',
      indexPattern: 'logs-*',
      metric: { operationType: 'count' },
      splitField: 'service.name',
      entities: {
        'service.name': 'checkout',
        'host.name': 'web-1',
      },
    });
    expect(extracted?.seed.selection).toEqual({
      start: Date.parse('2026-11-02T11:10:00.000Z'),
      end: Date.parse('2026-11-02T11:20:00.000Z'),
    });
  });

  it('builds a dashboard panel seed with panelTitle when parentApi is a dashboard', async () => {
    const embeddable = {
      type: 'lens',
      getSavedVis: () => ({}),
      title$: new BehaviorSubject('Checkout latency'),
      timeRange$: new BehaviorSubject(undefined),
      filters$: new BehaviorSubject<Filter[]>([]),
      query$: new BehaviorSubject({ language: 'kuery', query: '' }),
      parentApi: {
        type: 'dashboard',
        timeRange$: new BehaviorSubject({
          from: '2026-11-02T11:00:00.000Z',
          to: '2026-11-02T12:00:00.000Z',
        }),
        filters$: new BehaviorSubject<Filter[]>([]),
        query$: new BehaviorSubject({ language: 'kuery', query: 'service.name : "checkout"' }),
      },
    } as unknown as LensApi;

    const extracted = await extractLensChartSeed({
      embeddable,
      lens: makeLens(xyChartInfo({ visualizationType: 'lnsPie' })),
      origin: { app: 'dashboard', panelTitle: 'Checkout latency' },
    });

    expect(extracted?.metricUnreadable).toBe(true);
    expect(extracted?.seed.metric).toBeUndefined();
    expect(extracted?.seed.origin).toEqual({
      app: 'dashboard',
      panelTitle: 'Checkout latency',
    });
    expect(extracted?.seed.entities).toEqual({ 'service.name': 'checkout' });
  });
});
