/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useState } from 'react';

import { LogEntryHighlightsQuery } from '../../../graphql/types';
import { DependencyError, useApolloClient } from '../../../utils/apollo_context';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { logEntryHighlightsQuery } from './log_highlights.gql_query';

type LogEntryHighlights = LogEntryHighlightsQuery.Query['source']['logEntryHighlights'];

/**
 * NOTE: this is just an initial draft an not yet functional
 */

export const useLogHighlights = ({ sourceId }: { sourceId: string }) => {
  const apolloClient = useApolloClient();
  const [logEntryHighlights, setLogEntryHighlights] = useState<LogEntryHighlights | undefined>(
    undefined
  );

  /* const [loadLogEntryHighlightsRequest, loadLogEntryHighlights] =*/ useTrackedPromise(
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

  return {
    logEntryHighlights,
  };
};

export const LogEntryHighlightsContainer = createContainer(useLogHighlights);
