/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useEffect, useState, useMemo } from 'react';
import { TimeKey } from '../../../../common/time';
import { LogEntryHighlightsQuery } from '../../../graphql/types';
import { DependencyError, useApolloClient } from '../../../utils/apollo_context';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { logEntryHighlightsQuery } from './log_highlights.gql_query';

type LogEntryHighlights = LogEntryHighlightsQuery.Query['source']['logEntryHighlights'];

interface LogEntryHighlightsMap {
  [entryId: string]: LogEntryHighlights[0]['entries'];
}

export const useLogHighlightsState = ({
  sourceId,
  sourceVersion,
}: {
  sourceId: string;
  sourceVersion: string | undefined;
}) => {
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);
  const apolloClient = useApolloClient();
  const [logEntryHighlights, setLogEntryHighlights] = useState<LogEntryHighlights | undefined>(
    undefined
  );
  const [startKey, setStartKey] = useState<TimeKey | null>(null);
  const [endKey, setEndKey] = useState<TimeKey | null>(null);
  const [filterQuery, setFilterQuery] = useState(null);

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
            startKey,
            endKey,
            filterQuery,
            highlights: [
              {
                query: JSON.stringify({
                  multi_match: { query: highlightTerms[0], type: 'phrase' },
                }),
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
      if (highlightTerms.length && startKey && endKey) {
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
    highlightTerms,
    setHighlightTerms,
    setStartKey,
    setEndKey,
    setFilterQuery,
    logEntryHighlights,
    logEntryHighlightsById,
  };
};

export const LogHighlightsState = createContainer(useLogHighlightsState);
