/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapEsqlResponseToDatatable } from '@kbn/data-plugin/common/search/search_methods';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { MetricNode } from '@kbn/isomer';
import { createNodeValidator } from '../validate_node';
import type { KitServices } from './create_kit';
import { createMaterializeKit } from './create_kit';
import { createTestKitServices } from './kit_services.mock';

const validate = createNodeValidator();

// An ES|QL response mapped to a Datatable by Kibana's own mapper, as the `esql` executor gets it.
const esqlTable = (): Datatable =>
  mapEsqlResponseToDatatable(
    {
      columns: [
        { name: 'host.name', type: 'keyword' },
        { name: 'count', type: 'long' },
        { name: 'bucket', type: 'date' },
        { name: 'tags', type: 'keyword' },
      ],
      values: [
        ['web-01', 1234, '2026-11-04T06:00:00.000Z', ['a', 'b']],
        ['web-02', 98, '2026-11-04T07:00:00.000Z', 'c'],
        [null, 3, '2026-11-04T08:00:00.000Z', null],
      ],
    } as Parameters<typeof mapEsqlResponseToDatatable>[0],
    { query: 'FROM logs | STATS count = COUNT(*) BY host.name, bucket' }
  );

let services: KitServices;
beforeAll(async () => {
  services = await createTestKitServices();
});

describe('toChartData', () => {
  it('keeps an ES|QL table unreordered, with portable formats and the Datatable columns as source', async () => {
    const table = esqlTable();
    const kit = createMaterializeKit(services, { timeZone: 'Europe/Paris' });
    const { data, losses } = kit.toChartData(table);

    expect(losses).toEqual([]);
    expect(
      data.columns.map(({ id, type, role, multivalue }) => ({ id, type, role, multivalue }))
    ).toEqual([
      { id: 'host.name', type: 'string', role: 'dimension', multivalue: undefined },
      { id: 'count', type: 'number', role: 'metric', multivalue: undefined },
      { id: 'bucket', type: 'date', role: 'dimension', multivalue: undefined },
      { id: 'tags', type: 'string', role: 'dimension', multivalue: true },
    ]);
    expect(data.columns[1].format).toEqual({
      kind: 'number',
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
    expect(data.columns[2].format).toEqual(
      expect.objectContaining({ kind: 'date', year: 'numeric', timeZone: 'Europe/Paris' })
    );
    expect(data.columns.map(({ source }) => source)).toEqual(
      table.columns.map((column) => ({ kind: 'kibana-datatable-column', column }))
    );
    expect(data.source).toEqual({ kind: 'kibana-datatable', meta: table.meta });
    expect(data.rows).toEqual(
      table.rows.map((row) => table.columns.map(({ id }) => row[id] ?? null))
    );

    const node: MetricNode = {
      type: 'metric',
      title: 'Requests',
      data,
      value: { column: 'count' },
      breakdown: { column: 'host.name' },
    };
    expect(await validate(node)).toEqual([]);
  });

  it('keeps the chosen columns, roles and labels', () => {
    const kit = createMaterializeKit(services, {});
    const { data } = kit.toChartData(esqlTable(), {
      columns: ['count', 'host.name'],
      roles: { count: 'metric', 'host.name': 'dimension' },
      labels: { count: 'Requests' },
    });
    expect(data.columns.map(({ id, label }) => [id, label])).toEqual([
      ['count', 'Requests'],
      ['host.name', 'host.name'],
    ]);
    expect(data.rows[0]).toEqual([1234, 'web-01']);
    expect(() => kit.toChartData(esqlTable(), { columns: ['missing'] })).toThrow(
      'The table has no column "missing".'
    );
  });

  it("shows a terms column's Other and missing buckets with Kibana's labels, keeping raw values", () => {
    const table: Datatable = {
      type: 'datatable',
      columns: [
        {
          id: 'col-0',
          name: 'Top values of host.name',
          meta: {
            type: 'string',
            field: 'host.name',
            params: {
              id: 'terms',
              params: {
                id: 'string',
                otherBucketLabel: 'Other',
                missingBucketLabel: '(missing value)',
              },
            },
          },
        },
      ],
      rows: [{ 'col-0': 'web-01' }, { 'col-0': '__other__' }, { 'col-0': '__missing__' }],
    };
    const { data, losses } = createMaterializeKit(services, {}).toChartData(table);
    expect(data.rows).toEqual([['web-01'], ['__other__'], ['__missing__']]);
    expect(data.display).toEqual({ 'col-0': ['web-01', 'Other', '(missing value)'] });
    expect(losses).toEqual([
      expect.objectContaining({ path: 'data.columns[0].format', kind: 'prerendered' }),
    ]);
  });

  it("pre-renders a format without a portable form with Kibana's formatter", () => {
    const table: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'price', name: 'price', meta: { type: 'number', params: { id: 'currency' } } },
      ],
      rows: [{ price: 12.5 }, { price: null }],
    };
    const { registry } = services;
    const { data, losses } = createMaterializeKit(services, {}).toChartData(table);
    expect(data.columns[0].format).toBeUndefined();
    expect(data.display).toEqual({
      price: [12.5, null].map((value) => registry.getInstance('currency').convertToText(value)),
    });
    expect(losses).toEqual([expect.objectContaining({ kind: 'prerendered' })]);
  });

  it('holds values that are not of the column type as strings, and says so', () => {
    const table: Datatable = {
      type: 'datatable',
      columns: [{ id: 'range', name: 'bytes', meta: { type: 'number' } }],
      rows: [{ range: { gte: 0, lt: 100 } }, { range: 5 }],
    };
    const { data, losses } = createMaterializeKit(services, {}).toChartData(table);
    expect(data.columns[0]).toEqual(expect.objectContaining({ type: 'string', role: 'dimension' }));
    expect(data.columns[0].format).toBeUndefined();
    expect(data.rows).toEqual([['{"gte":0,"lt":100}'], ['5']]);
    expect(losses).toEqual([
      expect.objectContaining({ path: 'data.columns[0].type', kind: 'approximated' }),
    ]);
  });
});
