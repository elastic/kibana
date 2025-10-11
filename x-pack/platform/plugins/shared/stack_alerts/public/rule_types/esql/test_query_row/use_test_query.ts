/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiDataGridColumn } from '@elastic/eui';

interface TestQueryPreview {
  cols: EuiDataGridColumn[];
  rows: Array<Record<string, string | null>>;
}

interface TestQueryFetchResponse {
  timeWindow: string;
  preview?: TestQueryPreview;
}

interface TestQueryResponse {
  result: string | null;
  error: string | null;
  isLoading: boolean;
  preview: TestQueryPreview | null;
}

const TEST_QUERY_INITIAL_RESPONSE: TestQueryResponse = {
  result: null,
  error: null,
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
      isLoading: true,
      preview: null,
    });

    try {
      const { timeWindow, preview } = await fetch();
      let trimmedPreview = null;
      let count = 0;
      if (preview) {
        count = preview.rows.length;
        trimmedPreview = {
          cols: preview.cols,
          rows: preview.rows.slice(0, 5),
        };
      }
      const result = i18n.translate('xpack.stackAlerts.esql.ui.testQueryResponse', {
        defaultMessage: 'Query returned {rows} rows in the last {window}.',
        values: {
          rows: count,
          window: timeWindow,
        },
      });
      setTestQueryResponse({
        result,
        error: null,
        isLoading: false,
        preview: trimmedPreview,
      });
    } catch (err) {
      const message = err?.body?.attributes?.error?.root_cause[0]?.reason || err?.body?.message;
      setTestQueryResponse({
        result: null,
        error: i18n.translate('xpack.stackAlerts.esql.ui.queryError', {
          defaultMessage: 'Error testing query: {message}',
          values: { message: message ? `${err.message}: ${message}` : err.message },
        }),
        isLoading: false,
        preview: null,
      });
    }
  }, [fetch]);

  return {
    onTestQuery,
    testQueryResult: testQueryResponse.result,
    testQueryError: testQueryResponse.error,
    testQueryLoading: testQueryResponse.isLoading,
    testQueryPreview: testQueryResponse.preview,
  };
}
