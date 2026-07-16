/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLColumn, ESQLRow } from '@kbn/es-types';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { formatESQLColumns, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';

/**
 * This is a prototype: query results are not fetched from Elasticsearch. Instead, submitting a
 * query always returns this same canned dataset after a short simulated delay, so the editor's
 * "Search" interaction and the results accordion below it feel real without wiring up execution.
 */
const MOCK_COLUMNS: ESQLColumn[] = [
  { name: '@timestamp', type: 'date' },
  { name: 'message', type: 'keyword' },
  { name: 'host.name', type: 'keyword' },
  { name: 'event.count', type: 'long' },
];

const MOCK_ROWS: ESQLRow[] = [
  ['2026-07-16T10:15:32.000Z', 'Query executed successfully', 'search-node-1', 128],
  ['2026-07-16T10:14:58.000Z', 'Cache miss, falling back to disk', 'search-node-2', 47],
  ['2026-07-16T10:14:21.000Z', 'Shard rebalance completed', 'search-node-1', 3],
  ['2026-07-16T10:13:47.000Z', 'Query executed successfully', 'search-node-3', 215],
  ['2026-07-16T10:13:02.000Z', 'Slow query detected', 'search-node-2', 1],
];

export interface MockQueryPreviewResult {
  columns: ReturnType<typeof formatESQLColumns>;
  rows: ESQLRow[];
  dataView: Awaited<ReturnType<DataPublicPluginStart['dataViews']['create']>>;
  durationInMs: string;
  totalDocumentsProcessed: number;
}

/** Builds an ad hoc data view from the canned columns, without any Elasticsearch calls
 * (`skipFetchFields`), just so `ESQLDataGrid` has the `DataView` object it expects. */
const buildMockDataView = async (data: DataPublicPluginStart, esqlQuery: string) => {
  const indexPattern = getIndexPatternFromESQLQuery(esqlQuery) || 'unknown';
  const spec: DataViewSpec = {
    id: `esql-views-preview-${Date.now()}`,
    title: indexPattern,
    name: indexPattern,
    fields: Object.fromEntries(
      MOCK_COLUMNS.map(({ name, type }) => [
        name,
        {
          name,
          type: esFieldTypeToKibanaFieldType(type),
          esTypes: [type],
          searchable: true,
          aggregatable: true,
        },
      ])
    ),
  };
  return data.dataViews.create(spec, true);
};

export const runMockQueryPreview = async (
  data: DataPublicPluginStart,
  esqlQuery: string
): Promise<MockQueryPreviewResult> => {
  await new Promise((resolve) => setTimeout(resolve, 450));

  const dataView = await buildMockDataView(data, esqlQuery);

  return {
    columns: formatESQLColumns(MOCK_COLUMNS),
    rows: MOCK_ROWS,
    dataView,
    durationInMs: '128',
    totalDocumentsProcessed: MOCK_ROWS.length,
  };
};
