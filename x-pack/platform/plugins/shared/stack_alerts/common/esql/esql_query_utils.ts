/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { EsqlEsqlShardFailure } from '@elastic/elasticsearch/lib/api/types';

type EsqlDocument = Record<string, string | null>;

interface EsqlResultColumn {
  name: string;
  type: string;
}

interface EsqlQueryHits {
  results: Record<string, EsqlHit[]>;
  rows: EsqlDocument[];
  cols: Array<{ id: string; actions: boolean }>;
}

type EsqlResultRow = Array<string | null>;

const ESQL_DOCUMENT_ID = 'esql_query_document';
const CHUNK_SIZE = 100;

export interface EsqlHit {
  _id: string;
  _index: string;
  _source: EsqlDocument;
}

export interface EsqlTable {
  columns: EsqlResultColumn[];
  values: EsqlResultRow[];
  is_partial?: boolean;
  _clusters?: {
    details?: {
      [key: string]: {
        failures?: EsqlEsqlShardFailure[];
      };
    };
  };
}

export const ALERT_ID_COLUMN = 'Alert ID';

export const rowToDocument = (columns: EsqlResultColumn[], row: EsqlResultRow): EsqlDocument => {
  const doc: EsqlDocument = {};
  for (let i = 0; i < columns.length; ++i) {
    doc[columns[i].name] = row[i];
  }
  return doc;
};

export const getEsqlQueryHits = async (
  table: EsqlTable,
  isPreview: boolean = false,
  chunkSize: number = CHUNK_SIZE
): Promise<EsqlQueryHits> => {
  const rows: EsqlDocument[] = [];
  const groupedHits: Record<string, EsqlHit[]> = {};
  for (let r = 0; r < table.values.length; r++) {
    const row = table.values[r];
    const document = rowToDocument(table.columns, row);

    const alertId = uuidv4();
    const hit = {
      _id: ESQL_DOCUMENT_ID,
      _index: '',
      _source: document,
    };
    if (groupedHits[alertId]) {
      groupedHits[alertId].push(hit);
    } else {
      groupedHits[alertId] = [hit];
    }

    if (isPreview) {
      rows.push(Object.assign({ [ALERT_ID_COLUMN]: alertId }, document));
    }

    if (r !== 0 && r % chunkSize === 0) {
      await new Promise(setImmediate);
    }
  }

  return {
    results: groupedHits,
    rows,
    cols: isPreview ? getColumnsForPreview(table.columns) : [],
  };
};

export const transformToEsqlTable = (datatable: ESQLSearchResponse): EsqlTable => {
  const columns: EsqlResultColumn[] = datatable.columns;
  // Convert each value to string or null to match EsqlResultRow type
  const values: EsqlResultRow[] = datatable.values.map(
    (row) => row.map((v) => (v === null || typeof v === 'string' ? v : String(v))) as EsqlResultRow
  );
  return { columns, values };
};

const getColumnsForPreview = (
  columns: EsqlResultColumn[]
): Array<{ id: string; actions: boolean }> => {
  const cols = [{ id: ALERT_ID_COLUMN, actions: false }];
  for (const c of columns) {
    cols.push({ id: c.name, actions: false });
  }
  return cols;
};
