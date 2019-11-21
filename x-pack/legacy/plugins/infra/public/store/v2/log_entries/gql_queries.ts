/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { logEntriesQuery } from '../../../graphql/log_entries.gql_query';
import { useApolloClient } from '../../../utils/apollo_context';

const LOAD_CHUNK_SIZE = 200;

const getLogEntries = (client, countBefore, countAfter) => async ({
  sourceId,
  timeKey,
  filterQuery,
}) => {
  if (!timeKey) return false;
  try {
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
    const { logEntriesAround } = result.data.source;
    return {
      entries: logEntriesAround.entries,
      entriesStart: logEntriesAround.start,
      entriesEnd: logEntriesAround.end,
      hasMoreAfterEnd: logEntriesAround.hasMoreAfter,
      hasMoreBeforeStart: logEntriesAround.hasMoreBefore,
    };
  } catch (e) {
    console.error('GQL Error', e);
    throw e;
  }
};

export const useGraphQLQueries = () => {
  const client = useApolloClient();
  return {
    getLogEntriesAround: getLogEntries(client, LOAD_CHUNK_SIZE, LOAD_CHUNK_SIZE),
    getLogEntriesBefore: getLogEntries(client, LOAD_CHUNK_SIZE, 0),
    getLogEntriesAfter: getLogEntries(client, 0, LOAD_CHUNK_SIZE),
  };
};
