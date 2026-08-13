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
  ES_ARCHIVE_PATHS,
  KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX,
  TSDB_ISO_TIME_RANGE,
} from '../../../common/fixtures/constants';
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
}>;

const tsQuery = `TS ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY TBUCKET(100)`;
const aliasedTsQuery = `TS ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY custom_time_bucket = TBUCKET(100)`;

const QUERY_CASES: QueryCase[] = [
  {
    description: 'TS query with TBUCKET',
    sourceQuery: tsQuery,
    expectedQuery: tsQuery,
    expectedTimeField: 'TBUCKET(100)',
  },
  {
    description: 'TS query with aliased TBUCKET',
    sourceQuery: aliasedTsQuery,
    expectedQuery: aliasedTsQuery,
    expectedTimeField: 'custom_time_bucket',
  },
  {
    description: 'regular source query',
    sourceQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes)`,
    expectedQuery: `FROM ${KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX} | STATS avg_bytes = AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
    expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
  },
];

apiTest.describe(
  'Lens metric trendline query execution',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ esArchiver, samlAuth }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVE_PATHS.KIBANA_SAMPLE_DATA_LOGS_TSDB);
      cookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
    });

    for (const queryCase of QUERY_CASES) {
      apiTest(`executes ${queryCase.description}`, async ({ apiClient }) => {
        const generated = buildTrendlineQueryWithMetricFieldMap(
          queryCase.sourceQuery,
          '@timestamp'
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
        expect(columnNames).toContain('avg_bytes');
        expect(columnNames).toContain(queryCase.expectedTimeField);
        expect(response.body.rawResponse.values.length).toBeGreaterThan(0);
      });
    }
  }
);
