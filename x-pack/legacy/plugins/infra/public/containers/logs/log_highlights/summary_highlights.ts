/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';

import { SummaryHighlightsQuery } from '../../../graphql/types';
import { DependencyError, useApolloClient } from '../../../utils/apollo_context';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { summaryHighlightsQuery } from './log_highlights.gql_query';

export const useSummaryHighlights = (
  sourceId: string,
  sourceVersion: string | undefined,
  start: number | null,
  end: number | null,
  filterQuery: string | null,
  highlightTerms: string[]
) => {
  const apolloClient = useApolloClient();
  const [summaryHighlights, setSummaryHighlights] = useState<any | undefined>(undefined);

  const [loadSummaryHighlightsRequest, loadSummaryHighlights] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!apolloClient) {
          throw new DependencyError('Failed to load source: No apollo client available.');
        }
        if (!start || !end || !highlightTerms.length) {
          throw new Error();
        }

        return await apolloClient.query<
          SummaryHighlightsQuery.Query,
          SummaryHighlightsQuery.Variables
        >({
          fetchPolicy: 'no-cache',
          query: summaryHighlightsQuery,
          variables: {
            sourceId,
            start,
            end,
            filterQuery,
            highlights: [
              {
                query: JSON.stringify({
                  multi_match: { query: highlightTerms[0], type: 'phrase', lenient: true },
                }),
                countBefore: 1,
                countAfter: 1,
              },
            ],
          },
        });
      },
      onResolve: response => {
        setSummaryHighlights(response.data.source.summaryHighlights);
      },
    },
    [apolloClient, sourceId, start, end, filterQuery, highlightTerms]
  );

  const debouncedLoadSummaryHighlights = useMemo(() => debounce(loadSummaryHighlights, 275), [
    loadSummaryHighlights,
  ]);

  useEffect(() => {
    setSummaryHighlights(undefined);
  }, [highlightTerms]);

  useEffect(() => {
    if (highlightTerms.filter(highlightTerm => highlightTerm.length > 0).length && start && end) {
      debouncedLoadSummaryHighlights();
    } else {
      setSummaryHighlights(undefined);
    }
  }, [highlightTerms, start, end, filterQuery, sourceVersion]);

  return {
    summaryHighlights,
    loadSummaryHighlightsRequest,
  };
};
