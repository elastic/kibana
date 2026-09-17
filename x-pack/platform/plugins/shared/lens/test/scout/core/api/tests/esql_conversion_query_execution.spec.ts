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
      conversionCase.expected.success
        ? [
            {
              group,
              conversionCase,
              expectedEsql: conversionCase.expected.esql,
              columnNamesMatcher: conversionCase.expected.allowAdditionalColumns
                ? expect.arrayContaining([...conversionCase.expected.columnNames])
                : [...conversionCase.expected.columnNames],
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

    apiTest.beforeAll(async ({ esArchiver, samlAuth }) => {
      await Promise.all([
        esArchiver.loadIfNeeded(ES_ARCHIVE_PATHS.ML_ECOMMERCE),
        esArchiver.loadIfNeeded(ES_ARCHIVE_PATHS.KIBANA_SAMPLE_DATA_LOGS_TSDB),
      ]);
      cookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
    });

    // playwright/max-nested-describe allows only one level, so groups become
    // test-title prefixes instead of nested describe blocks.
    for (const queryCase of EXECUTABLE_CASES) {
      apiTest(
        `${queryCase.group}: executes converted query: ${queryCase.conversionCase.description}`,
        async ({ apiClient }) => {
          // Keep the exact query assertion close to execution so this layer verifies
          // the converter output that it sends to Elasticsearch.
          const { conversionCase, expectedEsql, columnNamesMatcher } = queryCase;
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
          expect(response.body.rawResponse.values.length).toBeGreaterThan(0);
        }
      );
    }
  }
);
