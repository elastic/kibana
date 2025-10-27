/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { apiTest } from '@kbn/scout';

export interface EsqlFixtureOptions {
  esqlDropNullColumns: boolean;
}

export interface EsqlFixture {
  esql: {
    query: (query: string) => Promise<EsqlResponse>;
    queryOnIndex: (indexName: string, query: string) => Promise<EsqlResponse>;
  };
}

export interface EsqlResponse {
  columns: EsqlEsqlColumnInfo[];
  columnNames: string[];
  values: FieldValue[][];

  /**
   * Represents documents returned by the ES|QL query, with each column mapped to its corresponding value.
   * The order is non-deterministic.
   */
  documents: Record<string, unknown>[];

  /**
   * Represents documents returned by the ES|QL query, sorted deterministically by the internal `order_id`.
   */
  documentsOrdered: Record<string, unknown>[];

  /**
   * ES|QL returns an explicit accompanying `.keyword` field. This collection drops those fields
   * for easier comparison with ingest pipeline results. The order is non-deterministic.
   */
  documentsWithoutKeywords: Record<string, unknown>[];

  /**
   * ES|QL returns an explicit accompanying `.keyword` field. This collection drops those fields
   * for easier comparison with ingest pipeline results. The documents are sorted deterministically by `order_id`.
   */
  documentsWithoutKeywordsOrdered: Record<string, unknown>[];
}

export const esqlFixture = apiTest.extend<{}, EsqlFixture & EsqlFixtureOptions>({
  esqlDropNullColumns: [false, { option: true, scope: 'worker' }],
  esql: [
    async ({ esClient, esqlDropNullColumns }, use) => {
      const executeEsqlQuery = async (query: string): Promise<EsqlResponse> => {
        if (!/^\s*from\s+/i.test(query)) {
          throw new Error('ES|QL query must start with a "from" clause.');
        }

        const response = await esClient.esql.query({
          query,
          drop_null_columns: esqlDropNullColumns,
        });

        const documents = response.values.map((valueRow: FieldValue[]) => {
          const doc: Record<string, unknown> = {};
          response.columns.forEach((col: EsqlEsqlColumnInfo, idx: number) => {
            doc[col.name] = valueRow[idx];
          });
          return doc;
        });

        const nonKeywordColumnIndices = response.columns
          .map((col, idx) => (!col.name.endsWith('.keyword') ? idx : -1))
          .filter((idx) => idx !== -1);

        const documentsWithoutKeywords = response.values.map((valueRow: FieldValue[]) => {
          const doc: Record<string, unknown> = {};
          nonKeywordColumnIndices.forEach((idx) => {
            doc[response.columns[idx].name] = valueRow[idx];
          });
          return doc;
        });

        // Sort the results by the implicitly added order_id for deterministic testing
        const sortById = (a: Record<string, unknown>, b: Record<string, unknown>) =>
          (a.order_id as number) - (b.order_id as number);

        const documentsOrdered = [...documents].sort(sortById);
        const documentsWithoutKeywordsOrdered = [...documentsWithoutKeywords].sort(sortById);

        return {
          columns: response.columns,
          columnNames: response.columns.map((col) => col.name),
          values: response.values,
          documents,
          documentsOrdered,
          documentsWithoutKeywords,
          documentsWithoutKeywordsOrdered,
        };
      };

      const queryOnIndex = async (indexName: string, queryStr: string): Promise<EsqlResponse> => {
        if (/^\s*from\s+/i.test(queryStr)) {
          throw new Error(
            'queryOnIndex should not receive a query that already contains a "from" clause.'
          );
        }
        const fullQuery = `from ${indexName} ${queryStr}`;
        return await executeEsqlQuery(fullQuery);
      };

      await use({ query: executeEsqlQuery, queryOnIndex });
    },
    { scope: 'worker' },
  ],
});
