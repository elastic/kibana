/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapEsqlResponseToDatatable } from '@kbn/data-plugin/common/search/search_methods';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { corpusCases } from './corpus_cases';

/** The table the `esql` executor gets for these columns and rows, from Kibana's own mapper. */
export const esqlTable = (
  columns: Array<{ name: string; type: string }>,
  values: unknown[][],
  query = 'FROM logs'
): Datatable =>
  mapEsqlResponseToDatatable(
    { columns, values } as Parameters<typeof mapEsqlResponseToDatatable>[0],
    { query }
  );

/** A corpus table as the `esql` executor returns it: before Lens formats its columns. */
export const corpusTable = (name: string): Datatable => {
  const { table } = corpusCases[name];
  if (!table) {
    throw new Error(`Corpus case ${name} has no table.`);
  }
  return esqlTable(
    table.columns.map(({ name: column, meta }) => ({ name: column, type: String(meta.esType) })),
    table.rows.map((row) => table.columns.map(({ id }) => row[id])),
    String(table.meta?.query ?? 'FROM logs')
  );
};
