/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useState } from 'react';
import { DependencyError, useApolloClient } from '../../../utils/apollo_context';
import { LogEntryHighlightsQuery } from '../../../graphql/types';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { logEntryHighlightsQuery } from './log_highlights.gql_query';
import { getPreviousTimeKey, getNextTimeKey } from '../../../../common/time';

type LogEntryHighlights = LogEntryHighlightsQuery.Query['source']['logEntryHighlights'];

export const useHighlightsFetcher = (
  sourceId,
  sourceVersion,
  startKey,
  endKey,
  filterQuery,
  highlightTerms
) => {
  const apolloClient = useApolloClient();
  const [logEntryHighlights, setLogEntryHighlights] = useState<LogEntryHighlights | undefined>(
    undefined
  );
  const [loadLogEntryHighlightsRequest, loadLogEntryHighlights] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!apolloClient) {
          throw new DependencyError('Failed to load source: No apollo client available.');
        }
        if (!startKey || !endKey || !highlightTerms.length) {
          throw new Error();
        }

        return await apolloClient.query<
          LogEntryHighlightsQuery.Query,
          LogEntryHighlightsQuery.Variables
        >({
          fetchPolicy: 'no-cache',
          query: logEntryHighlightsQuery,
          variables: {
            sourceId,
            startKey: getPreviousTimeKey(startKey), // interval boundaries are exclusive
            endKey: getNextTimeKey(endKey), // interval boundaries are exclusive
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
        setLogEntryHighlights(response.data.source.logEntryHighlights);
      },
    },
    [apolloClient, sourceId, startKey, endKey, filterQuery, highlightTerms]
  );

  useEffect(
    () => {
      setLogEntryHighlights(undefined);
    },
    [highlightTerms]
  );

  useEffect(
    () => {
      if (
        highlightTerms.filter(highlightTerm => highlightTerm.length > 0).length &&
        startKey &&
        endKey
      ) {
        loadLogEntryHighlights();
      } else {
        setLogEntryHighlights(undefined);
      }
    },
    [highlightTerms, startKey, endKey, filterQuery, sourceVersion]
  );

  const logEntryHighlightsById = useMemo(
    () =>
      logEntryHighlights
        ? logEntryHighlights.reduce<LogEntryHighlightsMap>(
            (accumulatedLogEntryHighlightsById, { entries }) => {
              return entries.reduce<LogEntryHighlightsMap>(
                (singleHighlightLogEntriesById, entry) => {
                  const highlightsForId = singleHighlightLogEntriesById[entry.gid] || [];
                  return {
                    ...singleHighlightLogEntriesById,
                    [entry.gid]: [...highlightsForId, entry],
                  };
                },
                accumulatedLogEntryHighlightsById
              );
            },
            {}
          )
        : {},
    [logEntryHighlights]
  );

  return {
    logEntryHighlights,
    logEntryHighlightsById,
    loadLogEntryHighlightsRequest,
  };
};
