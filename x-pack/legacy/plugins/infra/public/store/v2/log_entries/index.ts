/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useState, useReducer } from 'react';
import { createStructuredSelector } from 'reselect';
import { pick } from 'lodash';
import { useGraphQLQueries } from './gql_queries';
import { TimeKey, timeKeyIsBetween } from '../../../../common/time';
import { SerializedFilterQuery } from '../../local/log_filter';
import { InfraLogEntry } from './types';

const DESIRED_BUFFER_PAGES = 2;

enum Action {
  FetchingNewEntries,
  FetchingMoreEntries,
  ReceiveNewEntries,
  ReceiveEntriesBefore,
  ReceiveEntriesAfter,
  ErrorOnNewEntries,
  ErrorOnMoreEntries,
}

interface ActionObj {
  type: Action;
  payload?: Object;
}
type Dispatch = (action: ActionObj) => void;

interface LogEntriesDependencies {
  filterQuery: SerializedFilterQuery | null;
  timeKey: TimeKey | null;
  pagesBeforeStart: number | null;
  pagesAfterEnd: number | null;
}

const logEntriesInitialDependencies: LogEntriesDependencies = {
  filterQuery: null,
  timeKey: null,
  pagesBeforeStart: null,
  pagesAfterEnd: null,
};

type FetchEntriesParams = LogEntriesDependencies & {
  sourceId: string;
};

type FetchMoreEntriesParams = {
  pagesBeforeStart: number | null;
  pagesAfterEnd: number | null;
};

interface LogEntriesState {
  entries: InfraLogEntry[];
  entriesStart: TimeKey | null;
  entriesEnd: TimeKey | null;
  hasMoreAfter: boolean;
  hasMoreBefore: boolean;
  isReloading: boolean;
  isLoadingMore: boolean;
}

export const logEntriesInitialState: LogEntriesState = {
  entries: [],
  entriesStart: null,
  entriesEnd: null,
  hasMoreAfter: false,
  hasMoreBefore: false,
  isReloading: true,
  isLoadingMore: false,
};

const shouldFetchNewEntries = ({
  prevParams,
  timeKey,
  filterQuery,
  entriesStart,
  entriesEnd,
}: FetchEntriesParams & LogEntriesState & { prevParams: FetchEntriesParams }) => {
  if (!timeKey) return false;
  const shouldLoadWithNewFilter = filterQuery !== prevParams.filterQuery;
  const shouldLoadAroundNewPosition =
    !entriesStart || !entriesEnd || !timeKeyIsBetween(entriesStart, entriesEnd, timeKey);
  return shouldLoadWithNewFilter || shouldLoadAroundNewPosition;
};

enum ShouldFetchMoreEntries {
  Before,
  After,
}

const shouldFetchMoreEntries = ({ pagesAfterEnd, pagesBeforeStart }: FetchMoreEntriesParams) => {
  if (pagesBeforeStart === null || pagesAfterEnd === null) return false;
  if (pagesBeforeStart < DESIRED_BUFFER_PAGES) return ShouldFetchMoreEntries.Before;
  if (pagesAfterEnd < DESIRED_BUFFER_PAGES) return ShouldFetchMoreEntries.After;
  return false;
};

const useFetchEntriesEffect = (
  dispatch: Dispatch,
  state: LogEntriesState,
  params: FetchEntriesParams
) => {
  const { getLogEntriesAround, getLogEntriesBefore, getLogEntriesAfter } = useGraphQLQueries();

  const [prevParams, cachePrevParams] = useState(params);

  const runFetchNewEntriesRequest = async () => {
    dispatch({ type: Action.FetchingNewEntries });
    try {
      const payload = await getLogEntriesAround(params);
      dispatch({ type: Action.ReceiveNewEntries, payload });
    } catch (e) {
      dispatch({ type: Action.ErrorOnNewEntries });
    }
  };

  const runFetchMoreEntriesRequest = async (direction: ShouldFetchMoreEntries) => {
    dispatch({ type: Action.FetchingMoreEntries });
    const getEntriesBefore = direction === ShouldFetchMoreEntries.Before;
    const getMoreLogEntries = getEntriesBefore ? getLogEntriesBefore : getLogEntriesAfter;
    try {
      const payload = await getMoreLogEntries(params);
      dispatch({
        type: getEntriesBefore ? Action.ReceiveEntriesBefore : Action.ReceiveEntriesAfter,
        payload,
      });
    } catch (e) {
      dispatch({ type: Action.ErrorOnMoreEntries });
    }
  };

  const fetchNewEntriesEffectDependencies = Object.values(
    pick(params, ['sourceId', 'filterQuery', 'timeKey'])
  );
  const fetchNewEntriesEffect = () => {
    if (shouldFetchNewEntries({ ...params, ...state, prevParams })) {
      runFetchNewEntriesRequest();
    }
    cachePrevParams(params);
  };

  const fetchMoreEntriesEffectDependencies = Object.values(
    pick(params, ['pagesAfterEnd', 'pagesBeforeStart'])
  );
  const fetchMoreEntriesEffect = () => {
    const direction = shouldFetchMoreEntries(params);
    switch (direction) {
      case ShouldFetchMoreEntries.Before:
      case ShouldFetchMoreEntries.After:
        runFetchMoreEntriesRequest(direction);
        break;
      default:
        break;
    }
  };
  return [
    useEffect(fetchNewEntriesEffect, fetchNewEntriesEffectDependencies),
    useEffect(fetchMoreEntriesEffect, fetchMoreEntriesEffectDependencies),
  ];
};

export const useLogEntriesStore = () => {
  const [state, dispatch] = useReducer(logEntriesStateReducer, logEntriesInitialState);

  const [dependencies, subscriber] = useState(logEntriesInitialDependencies);

  useFetchEntriesEffect(dispatch, state, { ...dependencies, sourceId: 'default' });

  return [state, subscriber];
};

const logEntriesStateReducer = (prevState: LogEntriesState, action: ActionObj) => {
  switch (action.type) {
    case Action.ReceiveNewEntries:
      return { ...prevState, ...action.payload, isReloading: false };
    case Action.ReceiveEntriesBefore: {
      const newEntries = [...action.payload.entries, ...prevState.entries];
      return { ...prevState, ...action.payload, entries: newEntries, isLoadingMore: false };
    }
    case Action.ReceiveEntriesAfter: {
      const newEntries = [...prevState.entries, ...action.payload.entries];
      return { ...prevState, ...action.payload, entries: newEntries, isLoadingMore: false };
    }
    case Action.FetchingNewEntries:
      return { ...prevState, isReloading: true };
    case Action.FetchingMoreEntries:
      return { ...prevState, isLoadingMore: true };
    case Action.ErrorOnNewEntries:
      return { ...prevState, isReloading: false };
    case Action.ErrorOnMoreEntries:
      return { ...prevState, isLoadingMore: false };
    default:
      throw new Error();
  }
};

export const logEntriesDependenciesSelector = createStructuredSelector({
  filterQuery: state => state.logFilter.filterQuery,
  timeKey: state => state.logPosition.timeKey,
  pagesBeforeStart: state => state.logPosition.pagesBeforeStart,
  pagesAfterEnd: state => state.logPosition.pagesAfterEnd,
});
