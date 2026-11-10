/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggConfigs } from '@kbn/data-plugin/common';
import { mockAggTypesRegistry } from '@kbn/data-plugin/common/search/aggs/test_helpers';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import { MISSING_TOKEN } from '@kbn/field-formats-common';
import type { ChartEvent, MetricNode } from '@kbn/isomer';
import type { MaterializedNode } from '../nodes';
import { createMaterializeKit } from '../kit/create_kit';
import { createTestKitServices } from '../kit/kit_services.mock';
import type { KitServices } from '../kit/create_kit';
import type { SelectionServices } from './filters_for_selection';
import { filtersForSelection, tableFromNode } from './filters_for_selection';

// The data view and field names Kibana's own createFilter tests use, so their expected filters apply.
const createDataView = (fieldFormats: KitServices['registry']) =>
  createStubDataView({
    deps: { fieldFormats },
    spec: {
      id: '1234',
      title: 'logstash-*',
      timeFieldName: '@timestamp',
      fields: {
        field: {
          name: 'field',
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
        '@timestamp': {
          name: '@timestamp',
          type: 'date',
          esTypes: ['date'],
          aggregatable: true,
          searchable: true,
        },
      },
    },
  });

let dataView: ReturnType<typeof createDataView>;

const createServices = (): SelectionServices => ({
  dataViews: {
    get: jest.fn(async () => dataView),
    getFieldsForWildcard: jest.fn(async ({ fields = [] }) =>
      fields.map((name) => ({ name, type: 'string', searchable: true, aggregatable: true }))
    ),
  },
  aggs: {
    createAggConfigs: jest.fn(
      (indexPattern, configStates) =>
        new AggConfigs(
          indexPattern,
          configStates,
          { typesRegistry: mockAggTypesRegistry() },
          jest.fn()
        )
    ),
  },
});

const esaggsColumn = (
  id: string,
  type: DatatableColumn['meta']['type'],
  agg: object
): DatatableColumn => ({
  id,
  name: id,
  meta: { type, source: 'esaggs', sourceParams: { indexPatternId: '1234', ...agg } },
});

let kitServices: KitServices;
beforeAll(async () => {
  kitServices = await createTestKitServices();
  dataView = createDataView(kitServices.registry);
});

/** A metric node over `table`, its data built by the kit, as a materializer builds it. */
const nodeFor = (table: Datatable, breakdown: string, value: string): MaterializedNode => {
  const { data } = createMaterializeKit(kitServices, {}).toChartData(table);
  const node: MetricNode = {
    type: 'metric',
    id: 'panel-1',
    data,
    value: { column: value },
    breakdown: { column: breakdown },
  };
  return node;
};

const select = (columns: string[], rows: number[], negate?: boolean): ChartEvent => ({
  node: 'panel-1',
  kind: 'select',
  target: 'tile',
  rows,
  columns,
  ...(negate ? { negate } : {}),
  description: '',
  values: {},
});

const termsTable = (values: string[], otherBucket = true): Datatable => ({
  type: 'datatable',
  columns: [
    esaggsColumn('col-0', 'string', {
      type: 'terms',
      params: { field: 'field', otherBucket, missingBucket: true },
    }),
    esaggsColumn('col-1', 'number', { type: 'count' }),
  ],
  rows: values.map((value, index) => ({ 'col-0': value, 'col-1': index + 1 })),
  meta: { type: 'esaggs' },
});

describe('filtersForSelection', () => {
  describe('data view tables', () => {
    it('filters a terms cell to its value', async () => {
      const filters = await filtersForSelection(
        select(['col-0'], [0]),
        nodeFor(termsTable(['apache', 'nginx']), 'col-0', 'col-1'),
        createServices()
      );
      expect(filters).toHaveLength(1);
      expect(filters[0].query?.match_phrase?.field).toBe('apache');
      expect(filters[0].meta).toHaveProperty('index', '1234');
    });

    it("reads an xy datum's rows and columns, whatever series it names", async () => {
      const datum: ChartEvent = {
        node: 'panel-1',
        kind: 'select',
        target: 'datum',
        seriesKey: 'col-1',
        series: { layer: 0, y: 0 },
        rows: [1],
        columns: ['col-0'],
        description: '',
        values: {},
      };
      const [filter] = await filtersForSelection(
        datum,
        nodeFor(termsTable(['apache', 'nginx']), 'col-0', 'col-1'),
        createServices()
      );
      expect(filter.query?.match_phrase?.field).toBe('nginx');
    });

    it('filters the Other bucket out of the terms beside it', async () => {
      const [filter] = await filtersForSelection(
        select(['col-0'], [2]),
        nodeFor(termsTable(['apache', 'nginx', '__other__']), 'col-0', 'col-1'),
        createServices()
      );
      const should = filter.query?.bool?.should as Array<{ match_phrase: Record<string, string> }>;
      expect(should.map(({ match_phrase: phrase }) => phrase.field)).toEqual(['apache', 'nginx']);
      expect(filter.meta).toHaveProperty('negate', true);
      expect(filter.meta).toHaveProperty('index', '1234');
    });

    it('filters the missing bucket to documents without the field', async () => {
      const [filter] = await filtersForSelection(
        select(['col-0'], [1]),
        nodeFor(termsTable(['apache', MISSING_TOKEN]), 'col-0', 'col-1'),
        createServices()
      );
      expect(filter.query?.exists).toHaveProperty('field', 'field');
      expect(filter.meta).toHaveProperty('negate', true);
    });

    it('filters a histogram cell to its bucket', async () => {
      const table: Datatable = {
        type: 'datatable',
        columns: [
          esaggsColumn('col-0', 'number', {
            type: 'histogram',
            params: { field: 'bytes', interval: 1024 },
          }),
          esaggsColumn('col-1', 'number', { type: 'count' }),
        ],
        rows: [{ 'col-0': 2048, 'col-1': 5 }],
        meta: { type: 'esaggs' },
      };
      const [filter] = await filtersForSelection(
        select(['col-0'], [0]),
        nodeFor(table, 'col-0', 'col-1'),
        createServices()
      );
      expect(filter.query?.range?.bytes).toEqual(expect.objectContaining({ gte: 2048, lt: 3072 }));
      expect(filter.meta).toHaveProperty('index', '1234');
    });

    it('filters a range cell to its range', async () => {
      const table: Datatable = {
        type: 'datatable',
        columns: [
          esaggsColumn('col-0', 'string', {
            type: 'range',
            params: { field: 'bytes', ranges: [{ from: 1024, to: 2048 }] },
          }),
          esaggsColumn('col-1', 'number', { type: 'count' }),
        ],
        rows: [{ 'col-0': { gte: 1024, lt: 2048 }, 'col-1': 5 }],
        meta: { type: 'esaggs' },
      };
      // A range cell is an object, which chart data holds as a string; the source table keeps it.
      const node = nodeFor(table, 'col-0', 'col-1');
      const [filter] = await filtersForSelection(
        select(['col-0'], [0]),
        {
          ...node,
          data: { ...(node as MetricNode).data, rows: [[{ gte: 1024, lt: 2048 } as never, 5]] },
        } as MetricNode,
        createServices()
      );
      expect(filter.query?.range?.bytes).toEqual(expect.objectContaining({ gte: 1024, lt: 2048 }));
      expect(filter.meta).toHaveProperty('index', '1234');
    });

    it('filters a date histogram cell to its bucket', async () => {
      const bucket = Date.UTC(2026, 10, 4, 6);
      const table: Datatable = {
        type: 'datatable',
        columns: [
          esaggsColumn('col-0', 'date', {
            type: 'date_histogram',
            params: { field: '@timestamp', interval: '1h', time_zone: 'UTC' },
          }),
          esaggsColumn('col-1', 'number', { type: 'count' }),
        ],
        rows: [{ 'col-0': bucket, 'col-1': 5 }],
        meta: { type: 'esaggs' },
      };
      const [filter] = await filtersForSelection(
        select(['col-0'], [0]),
        nodeFor(table, 'col-0', 'col-1'),
        createServices()
      );
      const range = filter.query?.range?.['@timestamp'];
      expect(typeof range.gte).toBe('string');
      expect(typeof range.lt).toBe('string');
      expect(new Date(range.gte).valueOf()).toBe(bucket);
      expect(new Date(range.lt).valueOf()).toBeGreaterThan(bucket);
    });

    it('negates a "filter out" selection and drops duplicates', async () => {
      const filters = await filtersForSelection(
        select(['col-0', 'col-0'], [0], true),
        nodeFor(termsTable(['apache']), 'col-0', 'col-1'),
        createServices()
      );
      expect(filters).toHaveLength(1);
      expect(filters[0].meta.negate).toBe(true);
    });

    it('builds no filter for a metric column', async () => {
      await expect(
        filtersForSelection(
          select(['col-1'], [0]),
          nodeFor(termsTable(['apache']), 'col-0', 'col-1'),
          createServices()
        )
      ).resolves.toEqual([]);
    });

    it('filters a brushed date histogram to the brushed range', async () => {
      const from = Date.UTC(2026, 10, 4, 6);
      const to = Date.UTC(2026, 10, 4, 9);
      const table: Datatable = {
        type: 'datatable',
        columns: [
          esaggsColumn('col-0', 'date', {
            type: 'date_histogram',
            params: { field: '@timestamp', interval: '1h' },
          }),
          esaggsColumn('col-1', 'number', { type: 'count' }),
        ],
        rows: [{ 'col-0': from, 'col-1': 5 }],
        meta: { type: 'esaggs' },
      };
      const brush: ChartEvent = {
        node: 'panel-1',
        kind: 'brush',
        column: 'col-0',
        range: [from, to],
        description: '',
        values: {},
      };
      const [filter] = await filtersForSelection(
        brush,
        nodeFor(table, 'col-0', 'col-1'),
        createServices()
      );
      expect(filter.query?.range?.['@timestamp']).toEqual({
        format: 'strict_date_optional_time',
        gte: new Date(from).toISOString(),
        lt: new Date(to).toISOString(),
      });
      expect(filter.meta).toHaveProperty('index', '1234');
    });
  });

  describe('ES|QL tables', () => {
    // The table Kibana's createFilterESQL tests use.
    const esqlTable = (
      sourceParams: object,
      type: DatatableColumn['meta']['type'],
      value: unknown
    ): MaterializedNode => {
      const column: DatatableColumn = { name: 'test', id: '1-1', meta: { type, sourceParams } };
      return {
        type: 'metric',
        id: 'panel-1',
        data: {
          columns: [
            {
              id: '1-1',
              label: 'test',
              type: 'string',
              role: 'dimension',
              source: { kind: 'kibana-datatable-column', column },
            },
          ],
          rows: [[value as never]],
          source: { kind: 'kibana-datatable', meta: { type: 'es_ql' } },
        },
        value: { column: '1-1' },
      } as MetricNode;
    };

    it('filters a date histogram cell as Kibana does', async () => {
      const filters = await filtersForSelection(
        select(['1-1'], [0]),
        esqlTable(
          {
            indexPattern: 'logs*',
            sourceField: '@timestamp',
            operationType: 'date_histogram',
            interval: 1000,
          },
          'date',
          1696118400000
        ),
        createServices()
      );
      expect(filters).toEqual([
        {
          meta: { field: '@timestamp', formattedValue: 1696118400000, index: 'logs*', params: {} },
          query: {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: 1696118400000,
                lt: 1696118401000,
              },
            },
          },
        },
      ]);
    });

    it('filters a raw column to its value when the field can be filtered', async () => {
      const services = createServices();
      const filters = await filtersForSelection(
        select(['1-1'], [0]),
        esqlTable({ indexPattern: 'logs*', sourceField: 'message' }, 'string', 'test message'),
        services
      );
      expect(services.dataViews.getFieldsForWildcard).toHaveBeenCalledWith({
        pattern: 'logs*',
        fields: ['message'],
      });
      expect(filters).toHaveLength(1);
      expect(filters[0].query?.match_phrase).toEqual({ message: 'test message' });
    });

    it('filters a missing raw value to documents without the field', async () => {
      const filters = await filtersForSelection(
        select(['1-1'], [0]),
        esqlTable({ indexPattern: 'logs*', sourceField: 'message' }, 'string', null),
        createServices()
      );
      expect(filters).toEqual([
        { meta: { index: 'logs*', negate: true }, query: { exists: { field: 'message' } } },
      ]);
    });

    it('builds no filter for a field that cannot be filtered, or an aggregated null', async () => {
      const services = createServices();
      jest.mocked(services.dataViews.getFieldsForWildcard).mockResolvedValue([]);
      await expect(
        filtersForSelection(
          select(['1-1'], [0]),
          esqlTable({ indexPattern: 'logs*', sourceField: 'message' }, 'string', 'x'),
          services
        )
      ).resolves.toEqual([]);
      await expect(
        filtersForSelection(
          select(['1-1'], [0]),
          esqlTable(
            { indexPattern: 'logs*', sourceField: 'bytes', operationType: 'sum' },
            'number',
            null
          ),
          createServices()
        )
      ).resolves.toEqual([]);
    });
  });

  describe('tableFromNode', () => {
    it('rebuilds the Datatable the kit read', () => {
      const table = termsTable(['apache', '__other__']);
      expect(tableFromNode(nodeFor(table, 'col-0', 'col-1'))).toEqual(table);
    });

    it('refuses a node without Kibana column sources, or without data', () => {
      expect(() =>
        tableFromNode({
          type: 'metric',
          data: { columns: [{ id: 'a', label: 'a', type: 'number', role: 'metric' }], rows: [[1]] },
          value: { column: 'a' },
        } as MetricNode)
      ).toThrow('Column "a" did not come from a Kibana table.');
      expect(() => tableFromNode({ type: 'markdown', text: 'x' })).toThrow(
        'A "markdown" node has no data to select.'
      );
    });
  });
});
