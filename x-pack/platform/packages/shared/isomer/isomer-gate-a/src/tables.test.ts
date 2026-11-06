/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { mapEsqlResponseToDatatable } from '@kbn/data-plugin/common/search/search_methods';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { kibanaTables, listGateCases } from './corpus';
import { compareTables, datatableFromChartData } from './tables';

const kibana = (name: string): Datatable => {
  const gateCase = listGateCases().find((candidate) => candidate.name === name);
  if (!gateCase) {
    throw new Error(`No gate case ${name}`);
  }
  return kibanaTables(gateCase)[0];
};

const hugePerDay = () => kibana('isomer-corpus-values/values-xy-huge-esql/light');

/** The same data as the ES|QL search returns it, through Kibana's own mapper: ISO dates. */
const asEsqlSearchReturnsIt = (table: Datatable): Datatable =>
  mapEsqlResponseToDatatable(
    {
      columns: table.columns.map(({ id, meta }) => ({ name: id, type: String(meta.esType) })),
      values: table.rows.map((row) =>
        table.columns.map(({ id, meta }) =>
          meta.type === 'date' ? new Date(row[id]).toISOString() : row[id]
        )
      ),
    } as Parameters<typeof mapEsqlResponseToDatatable>[0],
    { query: 'FROM a' }
  );

describe('compareTables: known passes', () => {
  it("passes Kibana's table against the same data from the ES|QL search", () => {
    expect(compareTables(hugePerDay(), asEsqlSearchReturnsIt(hugePerDay()))).toEqual([]);
  });

  it('ignores columns only our table has', () => {
    const extra = asEsqlSearchReturnsIt(hugePerDay());
    extra.columns.push({ id: 'unused', name: 'unused', meta: { type: 'number' } });
    expect(compareTables(hugePerDay(), extra)).toEqual([]);
  });
});

describe('compareTables: known failures', () => {
  it('fails on a changed value', () => {
    const changed = cloneDeep(hugePerDay());
    changed.rows[1].total = 1;
    expect(compareTables(hugePerDay(), changed)).toEqual([
      expect.stringMatching(/^row 2 \[.*\] vs \[1,.*\]$/),
    ]);
  });

  it('tells reordered rows apart from different ones', () => {
    const reordered = cloneDeep(hugePerDay());
    reordered.rows.reverse();
    expect(compareTables(hugePerDay(), reordered)).toEqual([
      'rows are the same, in a different order',
    ]);
  });

  it('fails on a missing row, a missing column and a changed type', () => {
    const fewer = cloneDeep(hugePerDay());
    fewer.rows.pop();
    expect(compareTables(hugePerDay(), fewer)).toEqual(['row count 7 vs 6']);

    const missing = cloneDeep(hugePerDay());
    missing.columns = missing.columns.filter(({ id }) => id !== 'day');
    expect(compareTables(hugePerDay(), missing)).toEqual(['column "day" is missing']);

    const retyped = cloneDeep(hugePerDay());
    retyped.columns[0].meta.type = 'string';
    expect(compareTables(hugePerDay(), retyped)).toEqual([
      'column "total" type "number" vs "string"',
    ]);
  });
});

describe('datatableFromChartData', () => {
  it('rebuilds the table from the source columns charts carry', () => {
    const table = asEsqlSearchReturnsIt(hugePerDay());
    const data = {
      columns: table.columns.map((column) => ({
        id: column.id,
        label: column.name,
        type: 'number' as const,
        role: 'metric' as const,
        source: { kind: 'kibana-datatable-column', column },
      })),
      rows: table.rows.map((row) => table.columns.map(({ id }) => row[id])),
    };
    expect(compareTables(hugePerDay(), datatableFromChartData(data))).toEqual([]);
  });
});
