/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { SEARCH_API_BASE_URL } from '@kbn/data-plugin/server/search/routes';
import {
  type DateRange,
  type FormBasedLayer,
  type GenericIndexPatternColumn,
  generateEsqlQuery,
  type IndexPattern,
} from '@kbn/lens-common';
import {
  buildEsqlConversionCasesByGroup,
  createEsqlConversionInput,
  ESQL_CONVERSION_DATE_RANGE,
  type EsqlConversionCase,
} from '@kbn/lens-test-helpers';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ES_ARCHIVE_PATHS } from '../../../common/fixtures/constants';
import { apiTest } from '../fixtures';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
} as const;

const generateQueryForCase = (conversionCase: EsqlConversionCase): string => {
  const { esAggEntries, layer, indexPattern, uiSettings, dateRange, now, columnRoles } =
    createEsqlConversionInput(conversionCase);
  // Shared test helpers intentionally model only the fields these cases need and stay
  // independent of Lens production types to avoid a package dependency cycle. Cast through
  // unknown because these limited fixture types do not implement the full Lens contracts.
  const result = generateEsqlQuery(
    esAggEntries as unknown as Array<readonly [string, GenericIndexPatternColumn]>,
    layer as unknown as FormBasedLayer,
    indexPattern as unknown as IndexPattern,
    uiSettings,
    dateRange as unknown as DateRange,
    now,
    columnRoles
  );

  if (!result.success) {
    throw new Error(`Expected successful conversion for: ${conversionCase.description}`);
  }

  return result.esql;
};

// Only success cases execute against ES; failure cases are covered by the
// unit consumer of the shared matrix (@kbn/lens-common). Groups mirror the
// legacy per-topic unit test files (core, date_histogram, top_n, static_value).
// Narrowed to executable shape up front so the test body stays conditional-free.
const EXECUTABLE_CASES = Object.entries(buildEsqlConversionCasesByGroup()).flatMap(
  ([group, cases]) =>
    cases.flatMap((conversionCase) =>
      conversionCase.expected.success && !conversionCase.skipApiExecution
        ? [
            {
              group,
              conversionCase,
              expectedEsql: conversionCase.expected.esql,
              expectedLastRow: conversionCase.expected.expectedLastRow ?? {},
              columnNamesMatcher: conversionCase.expected.allowAdditionalColumns
                ? expect.arrayContaining([...conversionCase.expected.columnNames])
                : [...conversionCase.expected.columnNames],
            },
          ]
        : []
    )
);

// Resolved outside the test body so a renamed case fails at load time without a conditional.
const getOtherBucketRankedByMetricCase = (): EsqlConversionCase => {
  const found = EXECUTABLE_CASES.find(
    ({ conversionCase }) =>
      conversionCase.description === 'single terms with other bucket ranked by metric DESC'
  );
  if (!found) {
    throw new Error('Missing Other bucket conversion case');
  }
  return found.conversionCase;
};
const OTHER_BUCKET_RANKED_BY_METRIC_CASE = getOtherBucketRankedByMetricCase();

apiTest.describe(
  'Lens form-based → ES|QL conversion query execution',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ esArchiver, samlAuth }) => {
      await Promise.all([
        esArchiver.loadIfNeeded(ES_ARCHIVE_PATHS.ML_ECOMMERCE),
        esArchiver.loadIfNeeded(ES_ARCHIVE_PATHS.KIBANA_SAMPLE_DATA_LOGS_TSDB),
      ]);
      cookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
    });

    apiTest('preserves population standard deviation', async ({ esClient }) => {
      const index = 'lens-esql-standard-deviation-regression';
      const field = 'taxful_total_price';
      const conversionCase = EXECUTABLE_CASES.find(
        ({ conversionCase: candidate }) =>
          candidate.description === 'standard deviation of a numeric field'
      )?.conversionCase;
      if (!conversionCase) {
        throw new Error('Missing standard deviation conversion case');
      }

      await esClient.indices.create({
        index,
        mappings: { properties: { [field]: { type: 'double' } } },
      });
      try {
        await esClient.bulk({
          refresh: 'wait_for',
          operations: [0, 0, 0, 100].flatMap((value) => [
            { index: { _index: index } },
            { [field]: value },
          ]),
        });
        const query = generateQueryForCase({
          ...conversionCase,
          dataset: { ...conversionCase.dataset, index, timeField: undefined },
        });
        const converted = await esClient.esql.query({ query });
        const baseline = await esClient.search<never, { deviation: { std_deviation: number } }>({
          index,
          size: 0,
          aggs: { deviation: { extended_stats: { field } } },
        });

        expect(converted.values).toHaveLength(1);
        expect(converted.values[0][0]).toBeCloseTo(43.30127019, 6);
        expect(baseline.aggregations).toBeDefined();
        expect(baseline.aggregations?.deviation.std_deviation).toBeCloseTo(
          converted.values[0][0] as number,
          6
        );
      } finally {
        await esClient.indices.delete({ index });
      }
    });

    apiTest(
      'aggregates the Other bucket over the remaining documents like the DSL terms query',
      async ({ esClient }) => {
        const index = `lens-esql-other-bucket-${randomUUID()}`;
        const hostField = 'host.keyword';
        const bytesField = 'bytes';
        const size = 3;
        const baseCase = OTHER_BUCKET_RANKED_BY_METRIC_CASE;
        // Adds Count of records next to the case's average, so the Other row checks two
        // aggregates computed over every remaining document.
        const conversionCase: EsqlConversionCase = {
          ...baseCase,
          dataset: { ...baseCase.dataset, index, timeField: undefined },
          columns: {
            ...baseCase.columns,
            col3: {
              operationType: 'count',
              sourceField: '___records___',
              label: 'Count of records',
              dataType: 'number',
              isBucketed: false,
            },
          },
          columnOrder: [...baseCase.columnOrder, 'col3'],
        };

        // Top 3 by average bytes: a (100), b (90), c (70). Other groups d, e and f, so its
        // average (18) is not any single value's. The two documents without a host carry
        // large bytes to show they are left out of every bucket, Other included.
        const documents: Array<Record<string, string | number>> = [
          { [hostField]: 'a', [bytesField]: 100 },
          { [hostField]: 'a', [bytesField]: 100 },
          { [hostField]: 'a', [bytesField]: 100 },
          { [hostField]: 'b', [bytesField]: 90 },
          { [hostField]: 'b', [bytesField]: 90 },
          { [hostField]: 'c', [bytesField]: 80 },
          { [hostField]: 'c', [bytesField]: 60 },
          { [hostField]: 'd', [bytesField]: 40 },
          { [hostField]: 'd', [bytesField]: 20 },
          { [hostField]: 'e', [bytesField]: 10 },
          { [hostField]: 'f', [bytesField]: 2 },
          { [bytesField]: 5000 },
          { [bytesField]: 5000 },
        ];

        await esClient.indices.create({
          index,
          settings: { number_of_shards: 1 },
          mappings: {
            properties: { [hostField]: { type: 'keyword' }, [bytesField]: { type: 'long' } },
          },
        });
        try {
          await esClient.bulk({
            refresh: 'wait_for',
            operations: documents.flatMap((document) => [{ index: { _index: index } }, document]),
          });
          const query = generateQueryForCase(conversionCase);
          const converted = await esClient.esql.query({ query });

          // Same ranking as the chart's esaggs request: top values by average, with
          // `sum_other_doc_count` holding the documents that fall into Other.
          const topValues = await esClient.search<
            never,
            {
              hosts: {
                sum_other_doc_count: number;
                buckets: Array<{ key: string; doc_count: number; avg_bytes: { value: number } }>;
              };
            }
          >({
            index,
            size: 0,
            aggs: {
              hosts: {
                terms: { field: hostField, size, order: { avg_bytes: 'desc' } },
                aggs: { avg_bytes: { avg: { field: bytesField } } },
              },
            },
          });
          const { buckets, sum_other_doc_count: otherCount } = topValues.aggregations?.hosts ?? {
            buckets: [],
            sum_other_doc_count: 0,
          };
          const remaining = await esClient.search<never, { avg_bytes: { value: number } }>({
            index,
            size: 0,
            query: {
              bool: {
                filter: { exists: { field: hostField } },
                must_not: { terms: { [hostField]: buckets.map(({ key }) => key) } },
              },
            },
            aggs: { avg_bytes: { avg: { field: bytesField } } },
          });
          const otherAverage = remaining.aggregations?.avg_bytes.value;

          expect(converted.columns.map(({ name }) => name)).toStrictEqual([
            'AVG(bytes)',
            'COUNT(*)',
            hostField,
          ]);
          expect(converted.values).toStrictEqual([
            ...buckets.map(({ key, doc_count: docCount, avg_bytes: avg }) => [
              avg.value,
              docCount,
              key,
            ]),
            [otherAverage, otherCount, 'Other'],
          ]);
          // Pins the baseline itself, so a regression in both queries cannot go unnoticed.
          expect(converted.values).toStrictEqual([
            [100, 3, 'a'],
            [90, 2, 'b'],
            [70, 2, 'c'],
            [18, 4, 'Other'],
          ]);
        } finally {
          await esClient.indices.delete({ index });
        }
      }
    );

    // playwright/max-nested-describe allows only one level, so groups become
    // test-title prefixes instead of nested describe blocks.
    for (const queryCase of EXECUTABLE_CASES) {
      apiTest(
        `${queryCase.group}: executes converted query: ${queryCase.conversionCase.description}`,
        async ({ apiClient }) => {
          // Keep the exact query assertion close to execution so this layer verifies
          // the converter output that it sends to Elasticsearch.
          const { conversionCase, expectedEsql, expectedLastRow, columnNamesMatcher } = queryCase;
          const { timeField } = conversionCase.dataset;
          const esql = generateQueryForCase(conversionCase);
          expect(esql).toBe(expectedEsql);

          const response = await apiClient.post(`${SEARCH_API_BASE_URL}/${ESQL_SEARCH_STRATEGY}`, {
            headers: { ...INTERNAL_HEADERS, ...cookieHeader },
            body: {
              params: {
                query: esql,
                dropNullColumns: true,
                // No range filter for cases modeling a data view without
                // a time field.
                ...(timeField
                  ? {
                      filter: {
                        range: {
                          [timeField]: {
                            gte: ESQL_CONVERSION_DATE_RANGE.fromDate,
                            lte: ESQL_CONVERSION_DATE_RANGE.toDate,
                          },
                        },
                      },
                    }
                  : {}),
                ...(esql.includes('?_tstart')
                  ? {
                      params: [
                        { _tstart: ESQL_CONVERSION_DATE_RANGE.fromDate },
                        { _tend: ESQL_CONVERSION_DATE_RANGE.toDate },
                      ],
                    }
                  : {}),
              },
            },
          });

          expect(response).toHaveStatusCode(200);
          const responseColumnNames = response.body.rawResponse.columns.map(
            ({ name }: { name: string }) => name
          );
          expect(responseColumnNames).toStrictEqual(columnNamesMatcher);
          const { values } = response.body.rawResponse;
          expect(values.length).toBeGreaterThan(0);

          const lastRow = Object.fromEntries(
            responseColumnNames.map((name: string, index: number) => [name, values.at(-1)[index]])
          );
          expect(lastRow).toMatchObject(expectedLastRow);
        }
      );
    }
  }
);
