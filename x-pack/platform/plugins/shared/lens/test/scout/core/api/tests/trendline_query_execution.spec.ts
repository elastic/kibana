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
import { buildTrendlineQueryCases } from '@kbn/lens-test-helpers';
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

const QUERY_CASES = buildTrendlineQueryCases({ index: KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX });

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
      apiTest(`executes trendline query: ${queryCase.description}`, async ({ apiClient }) => {
        // Rewrite-output string assertions live in the unit consumer of the
        // shared case matrix (@kbn/lens-test-helpers); this layer verifies
        // execution against real Elasticsearch.
        const generated = buildTrendlineQueryWithMetricFieldMap(
          queryCase.sourceQuery,
          '@timestamp',
          queryCase.metricFields ? [...queryCase.metricFields] : undefined,
          queryCase.groupByFields ? [...queryCase.groupByFields] : undefined
        );

        const executeEsqlQuery = (query: string) =>
          apiClient.post(`${SEARCH_API_BASE_URL}/${ESQL_SEARCH_STRATEGY}`, {
            headers: { ...INTERNAL_HEADERS, ...cookieHeader },
            body: {
              params: {
                query,
                dropNullColumns: true,
                filter: {
                  range: {
                    '@timestamp': {
                      gte: TSDB_ISO_TIME_RANGE.start,
                      lte: TSDB_ISO_TIME_RANGE.end,
                    },
                  },
                },
                ...(query.includes('?_tstart')
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

        // The source query is what the metric panel's main layer runs; it must
        // be executable itself so the case reflects a real user query.
        const sourceResponse = await executeEsqlQuery(queryCase.sourceQuery);
        expect(sourceResponse).toHaveStatusCode(200);

        const response = await executeEsqlQuery(generated.query);

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
