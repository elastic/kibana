/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useState, useReducer, useCallback } from 'react';
import createContainer from 'constate';
import { pick } from 'lodash';
import { useGraphQLQueries } from './gql_queries';
import { TimeKey, timeKeyIsBetween } from '../../../../common/time';
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

type ReceiveActions =
  | Action.ReceiveNewEntries
  | Action.ReceiveEntriesBefore
  | Action.ReceiveEntriesAfter;

interface ReceiveEntriesAction {
  type: ReceiveActions;
  payload: LogEntriesResponse;
}
interface FetchOrErrorAction {
  type: Exclude<Action, ReceiveActions>;
}
type ActionObj = ReceiveEntriesAction | FetchOrErrorAction;

type Dispatch = (action: ActionObj) => void;

interface LogEntriesFetchParams {
  filterQuery: string | null;
  timeKey: TimeKey | null;
  pagesBeforeStart: number | null;
  pagesAfterEnd: number | null;
}

type FetchEntriesParams = LogEntriesFetchParams & {
  sourceId: string;
};

type FetchMoreEntriesParams = Pick<LogEntriesFetchParams, 'pagesBeforeStart' | 'pagesAfterEnd'>;

export interface LogEntriesResponse {
  entries: InfraLogEntry[];
  entriesStart: TimeKey | null;
  entriesEnd: TimeKey | null;
  hasMoreAfterEnd: boolean;
  hasMoreBeforeStart: boolean;
  lastLoadedTime: Date | null;
}

export type LogEntriesStateParams = {
  isReloading: boolean;
  isLoadingMore: boolean;
} & LogEntriesResponse;

export interface LogEntriesCallbacks {
  fetchNewerEntries: () => Promise<void>;
}
export const logEntriesInitialCallbacks = {
  fetchNewerEntries: async () => {},
};

export const logEntriesInitialState: LogEntriesStateParams = {
  entries: [],
  entriesStart: null,
  entriesEnd: null,
  hasMoreAfterEnd: false,
  hasMoreBeforeStart: false,
  isReloading: true,
  isLoadingMore: false,
  lastLoadedTime: null,
};

const shouldFetchNewEntries = ({
  prevParams,
  timeKey,
  filterQuery,
  entriesStart,
  entriesEnd,
}: FetchEntriesParams & LogEntriesStateParams & { prevParams: FetchEntriesParams }) => {
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
  state: LogEntriesStateParams,
  dispatch: Dispatch,
  params: FetchEntriesParams
) => {
  const { getLogEntriesAround, getLogEntriesBefore, getLogEntriesAfter } = useGraphQLQueries();

  const [prevParams, cachePrevParams] = useState(params);

  const runFetchNewEntriesRequest = useCallback(async () => {
    dispatch({ type: Action.FetchingNewEntries });
    try {
      const payload = await getLogEntriesAround(params);
      dispatch({ type: Action.ReceiveNewEntries, payload });
    } catch (e) {
      dispatch({ type: Action.ErrorOnNewEntries });
    }
  }, [params]);

  const runFetchMoreEntriesRequest = useCallback(
    async (direction: ShouldFetchMoreEntries) => {
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
    },
    [params]
  );

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
  const fetchMoreEntriesEffect = useCallback(() => {
    const direction = shouldFetchMoreEntries(params);
    switch (direction) {
      case ShouldFetchMoreEntries.Before:
      case ShouldFetchMoreEntries.After:
        runFetchMoreEntriesRequest(direction);
        break;
      default:
        break;
    }
  }, [params]);
  useEffect(fetchNewEntriesEffect, fetchNewEntriesEffectDependencies);
  useEffect(fetchMoreEntriesEffect, fetchMoreEntriesEffectDependencies);

  return {
    fetchNewerEntries: useCallback(() => runFetchMoreEntriesRequest(ShouldFetchMoreEntries.After), [
      params,
    ]),
  };
};

export const useLogEntriesState: (
  params: LogEntriesFetchParams
) => [LogEntriesStateParams, LogEntriesCallbacks] = params => {
  const [state, dispatch] = useReducer(logEntriesStateReducer, logEntriesInitialState);

  const { fetchNewerEntries } = useFetchEntriesEffect(state, dispatch, {
    ...params,
    sourceId: 'default',
  });
  const callbacks = { fetchNewerEntries };

  return [state, callbacks];
};

const logEntriesStateReducer = (prevState: LogEntriesStateParams, action: ActionObj) => {
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

export const LogEntriesState = createContainer(useLogEntriesState);
