/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ApolloClient } from 'apollo-client';
import { TimeKey } from '../../../../common/time';
import { SerializedFilterQuery } from '../../local/log_filter';
import { logEntriesQuery } from '../../../graphql/log_entries.gql_query';
import { useApolloClient } from '../../../utils/apollo_context';
import { LogEntriesState } from '.';

const LOAD_CHUNK_SIZE = 200;

type LogEntriesGetter = (
  client: ApolloClient<{}>,
  countBefore: number,
  countAfter: number
) => (params: {
  sourceId: string;
  timeKey: TimeKey;
  filterQuery: SerializedFilterQuery | null;
}) => Promise<false | LogEntriesState>;

const getLogEntries: LogEntriesGetter = (client, countBefore, countAfter) => async ({
  sourceId,
  timeKey,
  filterQuery,
}) => {
  if (!timeKey) return false;
  const result = await client.query({
    query: logEntriesQuery,
    variables: {
      sourceId,
      timeKey: { time: timeKey.time, tiebreaker: timeKey.tiebreaker },
      countBefore,
      countAfter,
      filterQuery,
    },
    fetchPolicy: 'no-cache',
  });
  if (!result.data.source) throw new Error('No data source');
  const { logEntriesAround } = result.data.source;
  return {
    entries: logEntriesAround.entries,
    entriesStart: logEntriesAround.start,
    entriesEnd: logEntriesAround.end,
    hasMoreAfterEnd: logEntriesAround.hasMoreAfter,
    hasMoreBeforeStart: logEntriesAround.hasMoreBefore,
    lastLoadedTime: new Date(),
  } as LogEntriesState;
};

export const useGraphQLQueries = () => {
  const client = useApolloClient();
  return {
    getLogEntriesAround: getLogEntries(client, LOAD_CHUNK_SIZE, LOAD_CHUNK_SIZE),
    getLogEntriesBefore: getLogEntries(client, LOAD_CHUNK_SIZE, 0),
    getLogEntriesAfter: getLogEntries(client, 0, LOAD_CHUNK_SIZE),
  };
};
