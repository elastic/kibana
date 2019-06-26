/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import React, { useContext, useEffect, useState } from 'react';
import { withStreamItems } from '../../../containers/logs/with_stream_items';
import { withLogFilter } from '../../../containers/logs/with_log_filter';
import { TimeKey } from '../../../../common/time';
import { LogEntryHighlightsQuery } from '../../../graphql/types';
import { DependencyError, useApolloClient } from '../../../utils/apollo_context';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { logEntryHighlightsQuery } from './log_highlights.gql_query';

type LogEntryHighlights = LogEntryHighlightsQuery.Query['source']['logEntryHighlights'];

export const useLogHighlightsState = ({ sourceId }: { sourceId: string }) => {
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

        return await apolloClient.query<
          LogEntryHighlightsQuery.Query,
          LogEntryHighlightsQuery.Variables
        >({
          fetchPolicy: 'no-cache',
          query: logEntryHighlightsQuery,
          variables: {
            sourceId,
            startKey: {
              time: 0,
              tiebreaker: 0,
            },
            endKey: {
              time: 0,
              tiebreaker: 0,
            },
            highlights: [
              {
                query: JSON.stringify({ multi_match: { query: 'jvm', type: 'phrase' } }),
              },
            ],
          },
        });
      },
      onResolve: response => {
        setLogEntryHighlights(response.data.source.logEntryHighlights);
      },
    },
    [apolloClient, sourceId]
  );

  useEffect(
    () => {
      // Terms, startKey, endKey or filter has changed, fetch data
    },
    [highlightTerms, startKey, endKey, filterQuery]
  );

  return {
    highlightTerms,
    setHighlightTerms,
    setStartKey,
    setEndKey,
    setFilterQuery,
    logEntryHighlights,
  };
};

export const LogHighlightsState = createContainer(useLogHighlightsState);

// Bridges Redux container state with Hooks state. Once state is moved fully from
// Redux to Hooks this can be removed.
export const LogHighlightsPositionBridge = withStreamItems(
  ({ entriesStart, entriesEnd }: { entriesStart: TimeKey | null; entriesEnd: TimeKey | null }) => {
    const { setStartKey, setEndKey } = useContext(LogHighlightsState.Context);
    useEffect(
      () => {
        setStartKey(entriesStart);
        setEndKey(entriesEnd);
      },
      [entriesStart, entriesEnd]
    );

    return null;
  }
);

export const LogHighlightsFilterQueryBridge = withLogFilter(
  ({ filterQuery }: { filterQuery: any }) => {
    const { setFilterQuery } = useContext(LogHighlightsState.Context);
    useEffect(
      () => {
        setFilterQuery(filterQuery);
      },
      [filterQuery]
    );

    return null;
  }
);

export const LogHighlightsBridge = ({ indexPattern }: { indexPattern: any }) => (
  <>
    <LogHighlightsPositionBridge />
    <LogHighlightsFilterQueryBridge indexPattern={indexPattern} />
  </>
);
