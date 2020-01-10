/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useState, useReducer, useCallback, useMemo } from 'react';
import createContainer from 'constate';
import { pick, throttle } from 'lodash';
import { TimeKey, timeKeyIsBetween } from '../../../../common/time';
import { LogEntriesResponse, LogEntry, LogEntriesRequest } from '../../../../common/http_api';
import { fetchLogEntries } from './api/fetch_log_entries';
import { datemathToEpochMillis } from '../../../utils/datemath';
import { InfraLogEntry, InfraLogEntryColumn } from './types';

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
  payload: LogEntriesResponse['data'];
}
interface FetchOrErrorAction {
  type: Exclude<Action, ReceiveActions>;
}
type ActionObj = ReceiveEntriesAction | FetchOrErrorAction;

type Dispatch = (action: ActionObj) => void;

interface LogEntriesProps {
  startDate: string | null;
  endDate: string | null;
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

export interface LogEntriesStateParams {
  entries: LogEntriesResponse['data']['entries'];
  topCursor: LogEntriesResponse['data']['topCursor'] | null;
  bottomCursor: LogEntriesResponse['data']['bottomCursor'] | null;
  isReloading: boolean;
  isLoadingMore: boolean;
  lastLoadedTime: Date | null;
}

export interface LogEntriesCallbacks {
  fetchNewerEntries: () => Promise<TimeKey | null | undefined>;
  checkForNewEntries: () => Promise<void>;
}
export const logEntriesInitialCallbacks = {
  fetchNewerEntries: async () => {},
};

export const logEntriesInitialState: LogEntriesStateParams = {
  entries: [],
  topCursor: null,
  bottomCursor: null,
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
  const [prevParams, cachePrevParams] = useState(props);
  const [startedStreaming, setStartedStreaming] = useState(false);

  const startTimestamp = useMemo(
    () => (props.startDate ? datemathToEpochMillis(props.startDate) : null),
    [props.startDate]
  );
  const endTimestamp = useMemo(
    () => (props.endDate ? datemathToEpochMillis(props.endDate) : null),
    [props.endDate]
  );

  const runFetchNewEntriesRequest = async (override = {}) => {
    if (!startTimestamp || !endTimestamp) {
      return;
    }

    dispatch({ type: Action.FetchingNewEntries });

    try {
      const { data: payload } = await fetchLogEntries({
        sourceId: props.sourceId,
        startDate: startTimestamp,
        endDate: endTimestamp,
        before: 'last', // TODO distinguish between first load and position-load
        query: props.filterQuery || undefined, // FIXME
      });
      dispatch({ type: Action.ReceiveNewEntries, payload });
    } catch (e) {
      dispatch({ type: Action.ErrorOnNewEntries });
    }
  };

  const runFetchMoreEntriesRequest = async (direction: ShouldFetchMoreEntries) => {
    if (!startTimestamp || !endTimestamp) {
      return;
    }

    dispatch({ type: Action.FetchingMoreEntries });

    const getEntriesBefore = direction === ShouldFetchMoreEntries.Before;

    try {
      const fetchArgs: LogEntriesRequest = {
        sourceId: props.sourceId,
        startDate: startTimestamp,
        endDate: endTimestamp,
        query: props.filterQuery || undefined, // FIXME
      };

      if (getEntriesBefore) {
        fetchArgs.before = state.topCursor;
      } else {
        fetchArgs.after = state.bottomCursor;
      }

      const { data: payload } = await fetchLogEntries(fetchArgs);

      dispatch({
        type: getEntriesBefore ? Action.ReceiveEntriesBefore : Action.ReceiveEntriesAfter,
        payload,
      });

      return payload.bottomCursor;
    } catch (e) {
      dispatch({ type: Action.ErrorOnMoreEntries });
    }
  };

  const fetchNewEntriesEffectDependencies = Object.values(
    pick(props, ['sourceId', 'filterQuery', 'timeKey', 'startDate', 'endDate'])
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
      return {
        ...prevState,
        ...action.payload,
        entries: newEntriesToOldEntries(action.payload.entries),
        lastLoadedTime: new Date(),
        isReloading: false,
      };
    case Action.ReceiveEntriesBefore: {
      const newEntries = newEntriesToOldEntries(action.payload.entries);
      const prevEntries = cleanDuplicateItems(prevState.entries, newEntries);

      const update = {
        entries: [...newEntries, ...prevEntries],
        isLoadingMore: false,
        topCursor: action.payload.topCursor,
        lastLoadedTime: new Date(),
      };

      return { ...prevState, ...update };
    }
    case Action.ReceiveEntriesAfter: {
      const newEntries = newEntriesToOldEntries(action.payload.entries);
      const prevEntries = cleanDuplicateItems(prevState.entries, newEntries);

      const update = {
        entries: [...prevEntries, ...newEntries],
        isLoadingMore: false,
        bottomCursor: action.payload.bottomCursor,
        lastLoadedTime: new Date(),
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

// FIXME temporal helper function to make it work while we adjust the types
function newEntriesToOldEntries(entries: LogEntry[]): InfraLogEntry[] {
  return entries.map(entry => {
    return {
      gid: entry.id,
      key: entry.cursor,
      columns: entry.columns as InfraLogEntryColumn[],
      source: 'default',
    };
  });
}
