/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { SEARCH_API_BASE_URL } from '@kbn/data-plugin/server/search/routes';
import { buildTrendlineQueryWithMetricFieldMap } from '@kbn/lens-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  KIBANA_SAMPLE_DATA_LOGS_TSDB_ARCHIVE,
  KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX,
  TSDB_ISO_TIME_RANGE,
} from '../fixtures/constants';
import { apiTest } from '../fixtures';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
} as const;

type QueryCase = Readonly<{
  description: string;
  sourceQuery: string;
  expectedQuery: string;
  expectedTimeField: string;
  expectedMetricFields: string[];
  metricFields?: string[];
  groupByFields?: string[];
}>;

const tsQuery = `TS ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY TBUCKET(100)`;
const aliasedTsQuery = `TS ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY custom_time_bucket = TBUCKET(100)`;

const QUERY_CASES: QueryCase[] = [
  {
    description: 'TS query with TBUCKET',
    sourceQuery: tsQuery,
    expectedQuery: tsQuery,
    expectedTimeField: 'TBUCKET(100)',
    expectedMetricFields: ['avg_bytes'],
  },
  {
    description: 'TS query with aliased TBUCKET',
    sourceQuery: aliasedTsQuery,
    expectedQuery: aliasedTsQuery,
    expectedTimeField: 'custom_time_bucket',
    expectedMetricFields: ['avg_bytes'],
  },
  {
    description: 'regular source query',
    sourceQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes)`,
    expectedQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
    expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
    expectedMetricFields: ['avg_bytes'],
  },
  {
    description: 'raw query without STATS',
    sourceQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | KEEP bytes`,
    expectedQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | KEEP bytes, @timestamp | STATS AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
    expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
    expectedMetricFields: ['AVG(bytes)'],
    metricFields: ['bytes'],
  },
  {
    description: 'raw query with breakdown',
    sourceQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX}`,
    expectedQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS AVG(bytes) BY request, BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
    expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
    expectedMetricFields: ['AVG(bytes)', 'request'],
    metricFields: ['bytes'],
    groupByFields: ['request'],
  },
  {
    description: 'TS query without TBUCKET',
    sourceQuery: `TS ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY request`,
    expectedQuery: `TS ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY request, TBUCKET(75)`,
    expectedTimeField: 'TBUCKET(75)',
    expectedMetricFields: ['avg_bytes', 'request'],
  },
  {
    description: 'FROM query with existing TBUCKET',
    sourceQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes) BY TBUCKET(100)`,
    expectedQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes) BY TBUCKET(100)`,
    expectedTimeField: 'TBUCKET(100)',
    expectedMetricFields: ['avg_bytes'],
  },
  {
    description: 'FROM query with aliased TBUCKET',
    sourceQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes) BY time_bucket = TBUCKET(100)`,
    expectedQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes) BY time_bucket = TBUCKET(100)`,
    expectedTimeField: 'time_bucket',
    expectedMetricFields: ['avg_bytes'],
  },
  {
    description: 'FROM query with KEEP after STATS',
    sourceQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes) | KEEP avg_bytes`,
    expectedQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend) | KEEP avg_bytes, \`BUCKET(@timestamp, 75, ?_tstart, ?_tend)\``,
    expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
    expectedMetricFields: ['avg_bytes'],
  },
  {
    description: 'FROM query with aliased BUCKET and KEEP after STATS',
    sourceQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes) BY time_bucket = BUCKET(@timestamp, 1 hour) | KEEP avg_bytes`,
    expectedQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes) BY time_bucket = BUCKET(@timestamp, 1 hour) | KEEP avg_bytes, time_bucket`,
    expectedTimeField: 'time_bucket',
    expectedMetricFields: ['avg_bytes'],
  },
  {
    description: 'TS query with renamed TBUCKET column',
    sourceQuery: `TS ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY bucket = TBUCKET(100) | RENAME bucket AS time`,
    expectedQuery: `TS ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY bucket = TBUCKET(100) | RENAME bucket AS time`,
    expectedTimeField: 'time',
    expectedMetricFields: ['avg_bytes'],
  },
  {
    description: 'FROM query with renamed BUCKET column and KEEP',
    sourceQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 hour) | RENAME bucket AS time | KEEP avg_bytes`,
    expectedQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 hour) | RENAME bucket AS time | KEEP avg_bytes, time`,
    expectedTimeField: 'time',
    expectedMetricFields: ['avg_bytes'],
  },
  {
    description: 'raw query with multiple metric fields',
    sourceQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX}`,
    expectedQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS AVG(bytes), AVG(phpmemory) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
    expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
    expectedMetricFields: ['AVG(bytes)', 'AVG(phpmemory)'],
    metricFields: ['bytes', 'phpmemory'],
  },
];

apiTest.describe(
  'Lens metric trendline query execution',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ esArchiver, samlAuth }) => {
      await esArchiver.loadIfNeeded(KIBANA_SAMPLE_DATA_LOGS_TSDB_ARCHIVE);
      cookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
    });

    for (const queryCase of QUERY_CASES) {
      apiTest(`executes trendline query: ${queryCase.description}`, async ({ apiClient }) => {
        const generated = buildTrendlineQueryWithMetricFieldMap(
          queryCase.sourceQuery,
          '@timestamp',
          queryCase.metricFields,
          queryCase.groupByFields
        );
        const usesTimeParams = generated.query.includes('?_tstart');

        expect(generated.query).toBe(queryCase.expectedQuery);
        expect(generated.timeField).toBe(queryCase.expectedTimeField);

        const response = await apiClient.post(`${SEARCH_API_BASE_URL}/${ESQL_SEARCH_STRATEGY}`, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: {
            params: {
              query: generated.query,
              dropNullColumns: true,
              filter: {
                range: {
                  '@timestamp': {
                    gte: TSDB_ISO_TIME_RANGE.start,
                    lte: TSDB_ISO_TIME_RANGE.end,
                  },
                },
              },
              ...(usesTimeParams
                ? {
                    params: [
                      { _tstart: TSDB_ISO_TIME_RANGE.start },
                      { _tend: TSDB_ISO_TIME_RANGE.end },
                    ],
                  }
                : {}),
            },
          },
        });

        expect(response).toHaveStatusCode(200);
        const columnNames = response.body.rawResponse.columns.map(
          ({ name }: { name: string }) => name
        );
        expect(columnNames).toStrictEqual([
          ...queryCase.expectedMetricFields,
          queryCase.expectedTimeField,
        ]);
        expect(response.body.rawResponse.values.length).toBeGreaterThan(0);
      });
    }
  }
);
