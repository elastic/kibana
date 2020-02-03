/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useState, useReducer, useCallback } from 'react';
import createContainer from 'constate';
import { pick, throttle, omit } from 'lodash';
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

interface LogEntriesProps {
  filterQuery: string | null;
  timeKey: TimeKey | null;
  pagesBeforeStart: number | null;
  pagesAfterEnd: number | null;
  sourceId: string;
  isAutoReloading: boolean;
  jumpToTargetPosition: (position: TimeKey) => void;
}

type FetchEntriesParams = Omit<LogEntriesProps, 'isAutoReloading'>;
type FetchMoreEntriesParams = Pick<LogEntriesProps, 'pagesBeforeStart' | 'pagesAfterEnd'>;

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
  fetchNewerEntries: () => Promise<TimeKey | null | undefined>;
  checkForNewEntries: () => Promise<void>;
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

const cleanDuplicateItems = (entriesA: InfraLogEntry[], entriesB: InfraLogEntry[]) => {
  const gids = new Set(entriesB.map(item => item.gid));
  return entriesA.filter(item => !gids.has(item.gid));
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

const shouldFetchMoreEntries = (
  { pagesAfterEnd, pagesBeforeStart }: FetchMoreEntriesParams,
  { hasMoreBeforeStart, hasMoreAfterEnd }: LogEntriesStateParams
) => {
  if (pagesBeforeStart === null || pagesAfterEnd === null) return false;
  if (pagesBeforeStart < DESIRED_BUFFER_PAGES && hasMoreBeforeStart)
    return ShouldFetchMoreEntries.Before;
  if (pagesAfterEnd < DESIRED_BUFFER_PAGES && hasMoreAfterEnd) return ShouldFetchMoreEntries.After;
  return false;
};

const useFetchEntriesEffect = (
  state: LogEntriesStateParams,
  dispatch: Dispatch,
  props: LogEntriesProps
) => {
  const { getLogEntriesAround, getLogEntriesBefore, getLogEntriesAfter } = useGraphQLQueries();

  const [prevParams, cachePrevParams] = useState(props);
  const [startedStreaming, setStartedStreaming] = useState(false);

  const runFetchNewEntriesRequest = async (override = {}) => {
    dispatch({ type: Action.FetchingNewEntries });
    try {
      const payload = await getLogEntriesAround({
        ...omit(props, 'jumpToTargetPosition'),
        ...override,
      });
      dispatch({ type: Action.ReceiveNewEntries, payload });
    } catch (e) {
      dispatch({ type: Action.ErrorOnNewEntries });
    }
  };

  const runFetchMoreEntriesRequest = async (direction: ShouldFetchMoreEntries) => {
    dispatch({ type: Action.FetchingMoreEntries });
    const getEntriesBefore = direction === ShouldFetchMoreEntries.Before;
    const timeKey = getEntriesBefore
      ? state.entries[0].key
      : state.entries[state.entries.length - 1].key;
    const getMoreLogEntries = getEntriesBefore ? getLogEntriesBefore : getLogEntriesAfter;
    try {
      const payload = await getMoreLogEntries({ ...props, timeKey });
      dispatch({
        type: getEntriesBefore ? Action.ReceiveEntriesBefore : Action.ReceiveEntriesAfter,
        payload,
      });
      return payload.entriesEnd;
    } catch (e) {
      dispatch({ type: Action.ErrorOnMoreEntries });
    }
  };

  const fetchNewEntriesEffectDependencies = Object.values(
    pick(props, ['sourceId', 'filterQuery', 'timeKey'])
  );
  const fetchNewEntriesEffect = () => {
    if (props.isAutoReloading) return;
    if (shouldFetchNewEntries({ ...props, ...state, prevParams })) {
      runFetchNewEntriesRequest();
    }
    cachePrevParams(props);
  };

  const fetchMoreEntriesEffectDependencies = [
    ...Object.values(pick(props, ['pagesAfterEnd', 'pagesBeforeStart'])),
    Object.values(pick(state, ['hasMoreBeforeStart', 'hasMoreAfterEnd'])),
  ];
  const fetchMoreEntriesEffect = () => {
    if (state.isLoadingMore || props.isAutoReloading) return;
    const direction = shouldFetchMoreEntries(props, state);
    switch (direction) {
      case ShouldFetchMoreEntries.Before:
      case ShouldFetchMoreEntries.After:
        runFetchMoreEntriesRequest(direction);
        break;
      default:
        break;
    }
  };

  const fetchNewerEntries = useCallback(
    throttle(() => runFetchMoreEntriesRequest(ShouldFetchMoreEntries.After), 500),
    [props, state.entriesEnd]
  );

  const streamEntriesEffectDependencies = [
    props.isAutoReloading,
    state.isLoadingMore,
    state.isReloading,
  ];
  const streamEntriesEffect = () => {
    (async () => {
      if (props.isAutoReloading && !state.isLoadingMore && !state.isReloading) {
        if (startedStreaming) {
          await new Promise(res => setTimeout(res, 5000));
        } else {
          const nowKey = {
            tiebreaker: 0,
            time: Date.now(),
          };
          props.jumpToTargetPosition(nowKey);
          setStartedStreaming(true);
          if (state.hasMoreAfterEnd) {
            runFetchNewEntriesRequest({
              timeKey: nowKey,
            });
            return;
          }
        }
        const newEntriesEnd = await runFetchMoreEntriesRequest(ShouldFetchMoreEntries.After);
        if (newEntriesEnd) {
          props.jumpToTargetPosition(newEntriesEnd);
        }
      } else if (!props.isAutoReloading) {
        setStartedStreaming(false);
      }
    })();
  };

  useEffect(fetchNewEntriesEffect, fetchNewEntriesEffectDependencies);
  useEffect(fetchMoreEntriesEffect, fetchMoreEntriesEffectDependencies);
  useEffect(streamEntriesEffect, streamEntriesEffectDependencies);

  return { fetchNewerEntries, checkForNewEntries: runFetchNewEntriesRequest };
};

export const useLogEntriesState: (
  props: LogEntriesProps
) => [LogEntriesStateParams, LogEntriesCallbacks] = props => {
  const [state, dispatch] = useReducer(logEntriesStateReducer, logEntriesInitialState);

  const { fetchNewerEntries, checkForNewEntries } = useFetchEntriesEffect(state, dispatch, props);
  const callbacks = { fetchNewerEntries, checkForNewEntries };

  return [state, callbacks];
};

const logEntriesStateReducer = (prevState: LogEntriesStateParams, action: ActionObj) => {
  switch (action.type) {
    case Action.ReceiveNewEntries:
      return { ...prevState, ...action.payload, isReloading: false };
    case Action.ReceiveEntriesBefore: {
      const prevEntries = cleanDuplicateItems(prevState.entries, action.payload.entries);
      const newEntries = [...action.payload.entries, ...prevEntries];
      const { hasMoreBeforeStart, entriesStart, lastLoadedTime } = action.payload;
      const update = {
        entries: newEntries,
        isLoadingMore: false,
        hasMoreBeforeStart,
        entriesStart,
        lastLoadedTime,
      };
      return { ...prevState, ...update };
    }
    case Action.ReceiveEntriesAfter: {
      const prevEntries = cleanDuplicateItems(prevState.entries, action.payload.entries);
      const newEntries = [...prevEntries, ...action.payload.entries];
      const { hasMoreAfterEnd, entriesEnd, lastLoadedTime } = action.payload;
      const update = {
        entries: newEntries,
        isLoadingMore: false,
        hasMoreAfterEnd,
        entriesEnd,
        lastLoadedTime,
      };
      return { ...prevState, ...update };
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
