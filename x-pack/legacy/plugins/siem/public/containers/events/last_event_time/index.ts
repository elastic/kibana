/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React, { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client';

import chrome from 'ui/chrome';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { GetLastEventTimeQuery, LastEventIndexKey, LastTimeDetails } from '../../../graphql/types';
import { inputsModel } from '../../../store';
import { QueryTemplateProps } from '../../query_template';

import { LastEventTimeGqlQuery } from './last_event_time.gql_query';

export interface LastEventTimeArgs {
  id: string;
  errorMessage: string;
  lastSeen: Date;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: LastEventTimeArgs) => React.ReactElement;
  indexKey: LastEventIndexKey;
}

export function useLastEventTimeQuery<TCache = object>(
  indexKey: LastEventIndexKey,
  details: LastTimeDetails,
  sourceId: string
) {
  const [loading, updateLoading] = useState(false);
  const [lastSeen, updateLastSeen] = useState<number | null>(null);
  const [errorMessage, updateErrorMessage] = useState<string | null>(null);
  const [currentIndexKey, updateCurrentIndexKey] = useState<LastEventIndexKey | null>(null);
  const apolloClient = useApolloClient();
  async function fetchLastEventTime(signal: AbortSignal) {
    updateLoading(true);
    if (apolloClient) {
      apolloClient
        .query<GetLastEventTimeQuery.Query, GetLastEventTimeQuery.Variables>({
          query: LastEventTimeGqlQuery,
          fetchPolicy: 'cache-first',
          variables: {
            sourceId,
            indexKey,
            details,
            defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
          },
          context: {
            fetchOptions: {
              signal,
            },
          },
        })
        .then(
          result => {
            updateLoading(false);
            updateLastSeen(get('data.source.LastEventTime.lastSeen', result));
            updateErrorMessage(null);
            updateCurrentIndexKey(currentIndexKey);
          },
          error => {
            updateLoading(false);
            updateLastSeen(null);
            updateErrorMessage(error.message);
          }
        );
    }
  }

  useEffect(() => {
    const abortCtrl = new AbortController();
    const signal = abortCtrl.signal;
    fetchLastEventTime(signal);
    return () => abortCtrl.abort();
  }, [apolloClient, indexKey, details.hostName, details.ip]);

  return { lastSeen, loading, errorMessage };
}
