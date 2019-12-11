/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';

import { LogSummaryHighlightsQuery } from '../../../graphql/types';
import { DependencyError, useApolloClient } from '../../../utils/apollo_context';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { logSummaryHighlightsQuery } from './log_summary_highlights.gql_query';

export type LogSummaryHighlights = LogSummaryHighlightsQuery.Query['source']['logSummaryHighlightsBetween'];

export const useLogSummaryHighlights = (
  sourceId: string,
  sourceVersion: string | undefined,
  start: number | null,
  end: number | null,
  bucketSize: number,
  filterQuery: string | null,
  highlightTerms: string[]
) => {
  const apolloClient = useApolloClient();
  const [logSummaryHighlights, setLogSummaryHighlights] = useState<LogSummaryHighlights>([]);

  const [loadLogSummaryHighlightsRequest, loadLogSummaryHighlights] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!apolloClient) {
          throw new DependencyError('Failed to load source: No apollo client available.');
        }
        if (!start || !end || !highlightTerms.length) {
          throw new Error('Skipping request: Insufficient parameters');
        }

        return await apolloClient.query<
          LogSummaryHighlightsQuery.Query,
          LogSummaryHighlightsQuery.Variables
        >({
          fetchPolicy: 'no-cache',
          query: logSummaryHighlightsQuery,
          variables: {
            sourceId,
            start,
            end,
            bucketSize,
            highlightQueries: [highlightTerms[0]],
            filterQuery,
          },
        });
      },
      onResolve: response => {
        setLogSummaryHighlights(response.data.source.logSummaryHighlightsBetween);
      },
    },
    [apolloClient, sourceId, start, end, bucketSize, filterQuery, highlightTerms]
  );

  const debouncedLoadSummaryHighlights = useMemo(() => debounce(loadLogSummaryHighlights, 275), [
    loadLogSummaryHighlights,
  ]);

  useEffect(() => {
    setLogSummaryHighlights([]);
  }, [highlightTerms]);

  useEffect(() => {
    if (highlightTerms.filter(highlightTerm => highlightTerm.length > 0).length && start && end) {
      debouncedLoadSummaryHighlights();
    } else {
      setLogSummaryHighlights([]);
    }
  }, [
    bucketSize,
    debouncedLoadSummaryHighlights,
    end,
    filterQuery,
    highlightTerms,
    sourceVersion,
    start,
  ]);

  return {
    logSummaryHighlights,
    loadLogSummaryHighlightsRequest,
  };
};
