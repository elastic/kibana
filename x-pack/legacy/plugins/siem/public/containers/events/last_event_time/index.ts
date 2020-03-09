/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { FetchPolicy } from '@apollo/client';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import {
  LastEventIndexKey,
  LastTimeDetails,
  useGetLastEventTimeQueryQuery,
} from '../../../graphql/types';
import { inputsModel } from '../../../store';
import { useUiSetting$ } from '../../../lib/kibana';

import { LastEventTimeGqlQuery } from './last_event_time.gql_query';

export interface LastEventTimeArgs {
  id: string;
  errorMessage: string;
  lastSeen: Date;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export const useLastEventTimeQuery = (
  indexKey: LastEventIndexKey,
  details: LastTimeDetails,
  sourceId: string
) => {
  const [defaultIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const options = {
    query: LastEventTimeGqlQuery,
    fetchPolicy: 'cache-first' as FetchPolicy,
    variables: {
      sourceId,
      indexKey,
      details,
      defaultIndex,
    },
  };

  const { data, loading, error } = useGetLastEventTimeQueryQuery(options);
  const lastSeen = get('source.LastEventTime.lastSeen', data);

  return {
    lastSeen,
    loading,
    errorMessage: error?.message,
  };
};
