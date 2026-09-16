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
import {
  buildEsqlConversionCasesByGroup,
  ESQL_CONVERSION_DATE_RANGE,
  ESQL_CONVERSION_DATASETS,
  ESQL_CONVERSION_NOW,
} from '@kbn/lens-test-helpers';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
} as const;

// Only success cases execute against ES; failure cases are covered by the
// unit consumer of the shared matrix (@kbn/lens-common). Groups mirror the
// legacy per-topic unit test files (core, date_histogram, top_n, static_value).
// Narrowed to executable shape up front so the test body stays conditional-free.
const EXECUTABLE_CASES = Object.entries(buildEsqlConversionCasesByGroup()).flatMap(
  ([group, cases]) =>
    cases.flatMap((conversionCase) =>
      conversionCase.expected.success
        ? [
            {
              group,
              description: conversionCase.description,
              timeField: conversionCase.dataset.timeField,
              esql: conversionCase.expected.esql,
              columnNames: conversionCase.expected.columnNames,
            },
          ]
        : []
    )
);

apiTest.describe(
  'Lens form-based → ES|QL conversion query execution',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      // Install with `now` pinned to the matrix reference time so the rebased
      // document timestamps fall inside ESQL_CONVERSION_DATE_RANGE.
      for (const dataset of Object.values(ESQL_CONVERSION_DATASETS)) {
        await apiServices.sampleData.install(
          dataset.id,
          undefined,
          ESQL_CONVERSION_NOW.toISOString()
        );
      }
      cookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
    });

    apiTest.afterAll(async ({ apiServices }) => {
      for (const dataset of Object.values(ESQL_CONVERSION_DATASETS)) {
        await apiServices.sampleData.remove(dataset.id);
      }
    });

    // playwright/max-nested-describe allows only one level, so groups become
    // test-title prefixes instead of nested describe blocks.
    for (const queryCase of EXECUTABLE_CASES) {
      apiTest(
        `${queryCase.group}: executes converted query: ${queryCase.description}`,
        async ({ apiClient }) => {
          // Generated-string assertions live in the unit consumer of the shared
          // case matrix; this layer pins the same strings in the matrix and
          // verifies execution against real Elasticsearch.
          const { esql, columnNames, timeField } = queryCase;

          const response = await apiClient.post(`${SEARCH_API_BASE_URL}/${ESQL_SEARCH_STRATEGY}`, {
            headers: { ...INTERNAL_HEADERS, ...cookieHeader },
            body: {
              params: {
                query: esql,
                dropNullColumns: true,
                filter: {
                  range: {
                    [timeField]: {
                      gte: ESQL_CONVERSION_DATE_RANGE.fromDate,
                      lte: ESQL_CONVERSION_DATE_RANGE.toDate,
                    },
                  },
                },
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
          expect(responseColumnNames).toStrictEqual([...columnNames]);
          expect(response.body.rawResponse.values.length).toBeGreaterThan(0);
        }
      );
    }
  }
);
