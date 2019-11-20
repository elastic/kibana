/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useState, useReducer } from 'react';
import { createStructuredSelector } from 'reselect';
import { useGraphQLQueries } from './gql_queries';

export const useLogEntriesStore = () => {
  const [state, dispatch] = useReducer(logEntriesStateReducer, logEntriesInitialState);
  const { entries, hasMoreAfter, hasMoreBefore, isReloading } = state;

  const { getLogEntriesAround } = useGraphQLQueries();

  const [dependencies, subscriber] = useState(logEntriesInitialDependencies);
  const { timeKey, filterQuery } = dependencies;

  const fetchNewEntriesDependencies = [filterQuery, timeKey];
  const fetchNewEntries = () => {
    if (!timeKey) return;
    dispatch({ type: 'FETCHING_NEW_ENTRIES' });
    getLogEntriesAround({ sourceId: 'default', timeKey, filterQuery })
      .then(payload => dispatch({ type: 'RECEIVE_NEW_ENTRIES', payload }))
      .catch(() => dispatch({ type: 'ERROR_ON_NEW_ENTRIES' }));
  };
  useEffect(fetchNewEntries, fetchNewEntriesDependencies);

  return [
    {
      entries,
      hasMoreBeforeStart: hasMoreBefore,
      hasMoreAfterEnd: hasMoreAfter,
      isReloading,
    },
    subscriber,
  ];
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
