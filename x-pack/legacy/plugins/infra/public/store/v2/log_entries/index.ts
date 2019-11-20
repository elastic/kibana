/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useState, useReducer } from 'react';
import { createStructuredSelector } from 'reselect';
import { useGraphQLQueries } from './gql_queries';
import { TimeKey, timeKeyIsBetween } from '../../../../common/time';

const useFetchEntriesEffect = (dispatch, { entriesStart, entriesEnd }, params) => {
  const { sourceId, timeKey, filterQuery } = params;
  const { getLogEntriesAround } = useGraphQLQueries();

  const runFetchNewEntriesRequest = async () => {
    dispatch({ type: 'FETCHING_NEW_ENTRIES' });
    try {
      const payload = await getLogEntriesAround({ sourceId, timeKey, filterQuery });
      dispatch({ type: 'RECEIVE_NEW_ENTRIES', payload });
    } catch (e) {
      dispatch({ type: 'ERROR_ON_NEW_ENTRIES' });
    }
  };

  const shouldFetchNewEntries = () => {
    if (!timeKey) return false;
    if (entriesStart && entriesEnd && timeKeyIsBetween(entriesStart, entriesEnd, timeKey)) {
      return false;
    }
    return true;
  };

  const fetchNewEntriesEffectDependencies = Object.values(params);

  const fetchNewEntriesEffect = () => {
    if (shouldFetchNewEntries()) {
      runFetchNewEntriesRequest();
    }
  };
  return useEffect(fetchNewEntriesEffect, fetchNewEntriesEffectDependencies);
};

export const useLogEntriesStore = () => {
  const [state, dispatch] = useReducer(logEntriesStateReducer, logEntriesInitialState);
  const {
    entries,
    entriesStart,
    entriesEnd,
    hasMoreAfterEnd,
    hasMoreBeforeStart,
    isReloading,
  } = state;

  const [dependencies, subscriber] = useState(logEntriesInitialDependencies);

  useFetchEntriesEffect(dispatch, state, { ...dependencies, sourceId: 'default' });

  return [state, subscriber];
};

const logEntriesStateReducer = (prevState, action) => {
  switch (action.type) {
    case 'RECEIVE_NEW_ENTRIES':
      return { ...prevState, ...action.payload, isReloading: false };
    case 'FETCHING_NEW_ENTRIES':
      return { ...prevState, isReloading: true };
    case 'ERROR_ON_NEW_ENTRIES':
      return { ...prevState, isReloading: false };
    default:
      throw new Error();
  }
};
export const logEntriesInitialState = {
  entries: [],
  hasMoreAfter: false,
  hasMoreBefore: false,
  isReloading: true,
};

export const logEntriesDependenciesSelector = createStructuredSelector({
  filterQuery: state => state.logFilter.filterQuery,
  timeKey: state => state.logPosition.timeKey,
});
const logEntriesInitialDependencies = {
  filterQuery: null,
  timeKey: null,
};
