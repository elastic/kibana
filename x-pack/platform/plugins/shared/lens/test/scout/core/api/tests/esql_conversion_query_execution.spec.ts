/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
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
import { tags, type EsClient } from '@kbn/scout';
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

const getExecutableCase = (description: string): EsqlConversionCase => {
  const conversionCase = EXECUTABLE_CASES.find(
    ({ conversionCase: candidate }) => candidate.description === description
  )?.conversionCase;
  if (!conversionCase) {
    throw new Error(`Missing conversion case: ${description}`);
  }
  return conversionCase;
};

const roundNumber = (value: unknown): unknown =>
  typeof value === 'number' ? Math.round(value * 1e6) / 1e6 : value;

/** Runs a conversion case against `index` and returns the given columns of every row. */
const runConvertedCase = async (
  esClient: EsClient,
  index: string,
  description: string,
  columnNames: readonly string[]
): Promise<unknown[][]> => {
  const conversionCase = getExecutableCase(description);
  const { columns, values } = await esClient.esql.query({
    query: generateQueryForCase({
      ...conversionCase,
      dataset: { ...conversionCase.dataset, index, timeField: undefined },
    }),
  });
  const columnIndexes = columnNames.map((name) =>
    columns.findIndex((column) => column.name === name)
  );
  return values.map((row) => columnIndexes.map((columnIndex) => roundNumber(row[columnIndex])));
};

interface MetricBucket {
  key: string;
  metric: { value: number };
}

interface DateMetricBucket {
  key_as_string: string;
  metric: { value: number };
}

const AVERAGE_BYTES: estypes.AggregationsAggregationContainer = { avg: { field: 'bytes' } };

const DAILY_AVERAGE_BYTES: estypes.AggregationsAggregationContainer = {
  date_histogram: { field: 'timestamp', fixed_interval: '1d', min_doc_count: 1 },
  aggs: { metric: AVERAGE_BYTES },
};

// Lens ranks Top values by the metric, and DSL breaks ties by key.
const topValuesAgg = (
  field: string,
  size: number,
  aggs: Record<string, estypes.AggregationsAggregationContainer> = {}
): estypes.AggregationsAggregationContainer => ({
  terms: { field, size, order: [{ metric: 'desc' }, { _key: 'asc' }] },
  aggs: { metric: AVERAGE_BYTES, ...aggs },
});

// The DSL Other request: documents that have the field but none of the top values.
const otherBucketQuery = (field: string, topKeys: string[]): estypes.QueryDslQueryContainer => ({
  bool: { filter: [{ exists: { field } }], must_not: [{ terms: { [field]: topKeys } }] },
});

const searchAggregations = async <TAggregations>(
  esClient: EsClient,
  index: string,
  request: Pick<estypes.SearchRequest, 'query' | 'aggs'>
): Promise<TAggregations> => {
  const { aggregations } = await esClient.search<never, TAggregations>({
    index,
    size: 0,
    ...request,
  });
  if (!aggregations) {
    throw new Error(`Missing aggregations for ${index}`);
  }
  return aggregations;
};

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

    apiTest('groups remaining values into Other like DSL', async ({ esClient }) => {
      const index = 'lens-esql-other-bucket-regression';
      const hosts = ['a', 'b', 'c', 'd', 'e'];
      const systems = ['w', 'x', 'y', 'z'];
      const days = ['2023-05-01T10:00:00.000Z', '2023-05-02T10:00:00.000Z'];
      // Each system ranks the hosts differently, so the inner top values differ per outer value,
      // and no two averages tie at a top-N cutoff.
      const gridDocs = hosts.flatMap((host, hostIndex) =>
        systems.flatMap((system, systemIndex) =>
          days.map((timestamp, dayIndex) => ({
            timestamp,
            bytes:
              1000 * ((hostIndex + systemIndex) % hosts.length) + 10 * systemIndex + dayIndex + 1,
            'host.keyword': host,
            'machine.os.keyword': system,
          }))
        )
      );
      // A document without one of the fields still counts for the other one. The two without a
      // host lift "x" into the top systems, because DSL ranks an outer value over all its
      // documents.
      const partialDocs = [
        { timestamp: days[0], bytes: 9000, 'machine.os.keyword': 'x' },
        { timestamp: days[0], bytes: 9000, 'machine.os.keyword': 'x' },
        { timestamp: days[1], bytes: 50, 'host.keyword': 'a' },
        { timestamp: days[1], bytes: 50, 'host.keyword': 'a' },
      ];

      await esClient.indices.create({
        index,
        mappings: {
          properties: {
            timestamp: { type: 'date' },
            bytes: { type: 'long' },
            'host.keyword': { type: 'keyword' },
            'machine.os.keyword': { type: 'keyword' },
          },
        },
      });
      try {
        await esClient.bulk({
          refresh: 'wait_for',
          operations: [...gridDocs, ...partialDocs].flatMap((doc) => [
            { index: { _index: index } },
            doc,
          ]),
        });

        const hostRanking = await searchAggregations<{
          top: { buckets: Array<MetricBucket & { series: { buckets: DateMetricBucket[] } }> };
        }>(esClient, index, {
          aggs: { top: topValuesAgg('host.keyword', 3, { series: DAILY_AVERAGE_BYTES }) },
        });
        const topHosts = hostRanking.top.buckets;
        const otherHosts = await searchAggregations<{
          metric: { value: number };
          series: { buckets: DateMetricBucket[] };
        }>(esClient, index, {
          query: otherBucketQuery(
            'host.keyword',
            topHosts.map(({ key }) => key)
          ),
          aggs: { metric: AVERAGE_BYTES, series: DAILY_AVERAGE_BYTES },
        });
        expect(topHosts.map(({ key }) => key)).toStrictEqual(['b', 'c', 'd']);

        expect(
          await runConvertedCase(
            esClient,
            index,
            'single terms with other bucket ranked by metric DESC',
            ['host.keyword', 'AVG(bytes)']
          )
        ).toStrictEqual([
          ...topHosts.map(({ key, metric }) => [key, roundNumber(metric.value)]),
          ['Other', roundNumber(otherHosts.metric.value)],
        ]);

        expect(
          await runConvertedCase(
            esClient,
            index,
            'terms with other bucket above a date histogram ranked by metric DESC',
            ['host.keyword', 'BUCKET(timestamp, 1 day)', 'AVG(bytes)']
          )
        ).toStrictEqual([
          ...topHosts.flatMap(({ key, series }) =>
            series.buckets.map((day) => [key, day.key_as_string, roundNumber(day.metric.value)])
          ),
          ...otherHosts.series.buckets.map((day) => [
            'Other',
            day.key_as_string,
            roundNumber(day.metric.value),
          ]),
        ]);

        const systemRanking = await searchAggregations<{
          top: { buckets: Array<MetricBucket & { inner: { buckets: MetricBucket[] } }> };
        }>(esClient, index, {
          aggs: {
            top: topValuesAgg('machine.os.keyword', 2, {
              inner: topValuesAgg('host.keyword', 3),
            }),
          },
        });
        const topSystems = systemRanking.top.buckets;
        const otherSystems = await searchAggregations<{ inner: { buckets: MetricBucket[] } }>(
          esClient,
          index,
          {
            query: otherBucketQuery(
              'machine.os.keyword',
              topSystems.map(({ key }) => key)
            ),
            aggs: { inner: topValuesAgg('host.keyword', 3) },
          }
        );
        expect(topSystems.map(({ key }) => key)).toStrictEqual(['x', 'z']);

        expect(
          await runConvertedCase(
            esClient,
            index,
            'nested terms with other bucket on the outer dimension ranked by metric DESC',
            ['machine.os.keyword', 'host.keyword', 'AVG(bytes)']
          )
        ).toStrictEqual([
          ...topSystems.flatMap(({ key: system, inner }) =>
            inner.buckets.map(({ key: host, metric }) => [system, host, roundNumber(metric.value)])
          ),
          ...otherSystems.inner.buckets.map(({ key: host, metric }) => [
            'Other',
            host,
            roundNumber(metric.value),
          ]),
        ]);
      } finally {
        await esClient.indices.delete({ index });
      }
    });

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
