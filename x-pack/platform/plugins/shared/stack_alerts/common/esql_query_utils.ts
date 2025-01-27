/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from '@kbn/expressions-plugin/common';

type EsqlDocument = Record<string, string | null>;

interface EsqlHit {
  _id: string;
  _index: string;
  _source: EsqlDocument;
}

interface EsqlResultColumn {
  name: string;
  type: string;
}

type EsqlResultRow = Array<string | null>;

export interface EsqlTable {
  columns: EsqlResultColumn[];
  values: EsqlResultRow[];
}

const ESQL_DOCUMENT_ID = 'esql_query_document';

export const rowToDocument = (columns: EsqlResultColumn[], row: EsqlResultRow): EsqlDocument => {
  return columns.reduce<Record<string, string | null>>((acc, column, i) => {
    acc[column.name] = row[i];

    return acc;
  }, {});
};

export const toEsQueryHits = (results: EsqlTable) => {
  const hits: EsqlHit[] = results.values.map((row) => {
    const document = rowToDocument(results.columns, row);
    return {
      _id: ESQL_DOCUMENT_ID,
      _index: '',
      _source: document,
    };
  });

  return {
    hits,
    total: hits.length,
  };
};

export const transformDatatableToEsqlTable = (results: Datatable): EsqlTable => {
  const columns: EsqlResultColumn[] = results.columns.map((c) => ({
    name: c.id,
    type: c.meta.type,
  }));
  const values: EsqlResultRow[] = results.rows.map((r) => Object.values(r));
  return { columns, values };
};
