/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { ParsedAggregationResults } from '@kbn/triggers-actions-ui-plugin/common';
import type { EuiDataGridColumn } from '@elastic/eui';

interface TestQueryPreview {
  cols: EuiDataGridColumn[];
  rows: Array<Record<string, string | null>>;
}

interface TestQueryFetchResponse {
  testResults: ParsedAggregationResults;
  isGrouped: boolean;
  timeWindow: string;
  isGroupedByRow?: boolean;
  preview?: TestQueryPreview;
  warning?: string;
}

interface TestQueryResponse {
  result: string | null;
  error: string | null;
  warning: string | null;
  isLoading: boolean;
  preview: TestQueryPreview | null;
}

const TEST_QUERY_INITIAL_RESPONSE: TestQueryResponse = {
  result: null,
  error: null,
  warning: null,
  isLoading: false,
  preview: null,
};

/**
 * Hook used to test the data fetching execution by returning a number of found documents
 * Or in error in case it's failing
 */
export function useTestQuery(fetch: () => Promise<TestQueryFetchResponse>) {
  const [testQueryResponse, setTestQueryResponse] = useState<TestQueryResponse>(
    TEST_QUERY_INITIAL_RESPONSE
  );

  // Reset query response when criteria got changed
  useEffect(() => {
    setTestQueryResponse(TEST_QUERY_INITIAL_RESPONSE);
  }, [fetch]);

  const onTestQuery = useCallback(async () => {
    setTestQueryResponse({
      result: null,
      error: null,
      warning: null,
      isLoading: true,
      preview: null,
    });

    try {
      const { testResults, isGrouped, isGroupedByRow, timeWindow, preview, warning } =
        await fetch();
      let trimmedPreview = null;
      if (preview) {
        trimmedPreview = {
          cols: preview.cols,
          rows: preview.rows.slice(0, 5),
        };
      }
      if (isGrouped) {
        const count = testResults.results.length;
        const result = isGroupedByRow
          ? i18n.translate('xpack.stackAlerts.esQuery.ui.testQueryGroupedByRowResponse', {
              defaultMessage: 'Query returned {rows} rows in the last {window}.',
              values: {
                rows: count,
                window: timeWindow,
              },
            })
          : i18n.translate('xpack.stackAlerts.esQuery.ui.testQueryGroupedResponse', {
              defaultMessage: 'Grouped query matched {groups} groups in the last {window}.',
              values: {
                groups: testResults.results.length,
                window: timeWindow,
              },
            });
        setTestQueryResponse({
          result,
          error: null,
          warning: warning ?? null,
          isLoading: false,
          preview: trimmedPreview,
        });
      } else {
        const ungroupedQueryResponse =
          testResults.results.length > 0 ? testResults.results[0] : { count: 0 };
        setTestQueryResponse({
          result: i18n.translate('xpack.stackAlerts.esQuery.ui.numQueryMatchesText', {
            defaultMessage: 'Query matched {count} documents in the last {window}.',
            values: { count: ungroupedQueryResponse?.count ?? 0, window: timeWindow },
          }),
          error: null,
          warning: null,
          isLoading: false,
          preview: trimmedPreview,
        });
      }
    } catch (err) {
      const message = err?.body?.attributes?.error?.root_cause[0]?.reason || err?.body?.message;
      setTestQueryResponse({
        result: null,
        error: i18n.translate('xpack.stackAlerts.esQuery.ui.queryError', {
          defaultMessage: 'Error testing query: {message}',
          values: { message: message ? `${err.message}: ${message}` : err.message },
        }),
        warning: null,
        isLoading: false,
        preview: null,
      });
    }
  }, [fetch]);

  const resetTestQueryResponse = useCallback(() => {
    setTestQueryResponse(TEST_QUERY_INITIAL_RESPONSE);
  }, []);

  return {
    onTestQuery,
    resetTestQueryResponse,
    testQueryResult: testQueryResponse.result,
    testQueryError: testQueryResponse.error,
    testQueryWarning: testQueryResponse.warning,
    testQueryLoading: testQueryResponse.isLoading,
    testQueryPreview: testQueryResponse.preview,
  };
}
