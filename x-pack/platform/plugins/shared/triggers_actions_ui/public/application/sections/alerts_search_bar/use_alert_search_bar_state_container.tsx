/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/Either';
import { pipe } from 'fp-ts/pipeable';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { type SavedQuery, TimefilterContract } from '@kbn/data-plugin/public';
import {
  createKbnUrlStateStorage,
  syncState,
  IKbnUrlStateStorage,
  useContainerSelector,
  createStateContainer,
  createStateContainerReactHelpers,
} from '@kbn/kibana-utils-plugin/public';

import * as t from 'io-ts';
import { datemathStringRt } from '@kbn/io-ts-utils';
import { Filter } from '@kbn/es-query';
import { FilterControlConfig } from '@kbn/alerts-ui-shared';
import { useKibana } from '../../../common/lib/kibana';

interface AlertSearchBarContainerState {
  /**
   * Time range start
   */
  rangeFrom: string;
  /**
   * Time range end
   */
  rangeTo: string;
  /**
   * KQL bar query
   */
  kuery: string;
  /**
   * Filters applied from the KQL bar
   */
  filters: Filter[];
  /**
   * Saved query ID
   */
  savedQueryId?: string;
  /**
   * Filters applied from the controls bar
   */
  controlFilters: Filter[];
  /**
   * Filter controls bar configuration
   */
  filterControls: FilterControlConfig[];
}

interface AlertSearchBarStateTransitions {
  setRangeFrom: (
    state: AlertSearchBarContainerState
  ) => (rangeFrom: string) => AlertSearchBarContainerState;
  setRangeTo: (
    state: AlertSearchBarContainerState
  ) => (rangeTo: string) => AlertSearchBarContainerState;
  setKuery: (
    state: AlertSearchBarContainerState
  ) => (kuery: string) => AlertSearchBarContainerState;
  setFilters: (
    state: AlertSearchBarContainerState
  ) => (filters: Filter[]) => AlertSearchBarContainerState;
  setControlFilters: (
    state: AlertSearchBarContainerState
  ) => (controlFilters: Filter[]) => AlertSearchBarContainerState;
  setSavedQueryId: (
    state: AlertSearchBarContainerState
  ) => (savedQueryId?: string) => AlertSearchBarContainerState;
  setFilterControls: (
    state: AlertSearchBarContainerState
  ) => (filterControls: FilterControlConfig[]) => AlertSearchBarContainerState;
}

const defaultState: AlertSearchBarContainerState = {
  rangeFrom: 'now-24h',
  rangeTo: 'now',
  kuery: '',
  filters: [],
  controlFilters: [],
  filterControls: [],
};

const transitions: AlertSearchBarStateTransitions = {
  setRangeFrom: (state) => (rangeFrom) => ({ ...state, rangeFrom }),
  setRangeTo: (state) => (rangeTo) => ({ ...state, rangeTo }),
  setKuery: (state) => (kuery) => ({ ...state, kuery }),
  setFilters: (state) => (filters) => ({ ...state, filters }),
  setControlFilters: (state) => (controlFilters) => ({ ...state, controlFilters }),
  setSavedQueryId: (state) => (savedQueryId) => ({ ...state, savedQueryId }),
  setFilterControls: (state) => (filterControls) => ({ ...state, filterControls }),
};

export const alertSearchBarStateContainer = createStateContainer(defaultState, transitions);

type AlertSearchBarStateContainer = typeof alertSearchBarStateContainer;

export const { Provider, useContainer } =
  createStateContainerReactHelpers<AlertSearchBarStateContainer>();

export function useAlertSearchBarStateContainer(
  urlStorageKey: string,
  { replace }: { replace?: boolean } = {}
) {
  const [savedQuery, setSavedQuery] = useState<SavedQuery>();
  const stateContainer = useContainer();

  useUrlStateSyncEffect(stateContainer, urlStorageKey, replace);

  const {
    setRangeFrom,
    setRangeTo,
    setKuery,
    setFilters,
    setSavedQueryId,
    setControlFilters,
    setFilterControls,
  } = stateContainer.transitions;
  const { rangeFrom, rangeTo, kuery, filters, savedQueryId, controlFilters, filterControls } =
    useContainerSelector(stateContainer, (state) => state);

  useEffect(() => {
    if (!savedQuery) {
      setSavedQueryId(undefined);
      return;
    }
    if (savedQuery.id !== savedQueryId) {
      setSavedQueryId(savedQuery.id);
      if (typeof savedQuery.attributes.query.query === 'string') {
        setKuery(savedQuery.attributes.query.query);
      }
      if (savedQuery.attributes.filters?.length) {
        setFilters(savedQuery.attributes.filters);
      }
      if (savedQuery.attributes.timefilter?.from) {
        setRangeFrom(savedQuery.attributes.timefilter.from);
      }
      if (savedQuery.attributes.timefilter?.to) {
        setRangeFrom(savedQuery.attributes.timefilter.to);
      }
    }
  }, [
    savedQuery,
    savedQueryId,
    setFilters,
    setKuery,
    setRangeFrom,
    setSavedQueryId,
    stateContainer,
  ]);

  return {
    kuery,
    onKueryChange: setKuery,
    filters,
    onFiltersChange: setFilters,
    controlFilters,
    onControlFiltersChange: setControlFilters,
    filterControls,
    onFilterControlsChange: setFilterControls,
    rangeFrom,
    onRangeFromChange: setRangeFrom,
    rangeTo,
    onRangeToChange: setRangeTo,
    savedQuery,
    setSavedQuery,
    clearSavedQuery() {
      setSavedQueryId(undefined);
    },
  };
}

const setupUrlStateSync = (
  stateContainer: AlertSearchBarStateContainer,
  urlStateStorage: IKbnUrlStateStorage,
  urlStorageKey: string,
  replace: boolean = true
) => {
  // This handles filling the state when an incomplete URL set is provided
  const setWithDefaults = (changedState: Partial<AlertSearchBarContainerState> | null) => {
    stateContainer.set({ ...defaultState, ...changedState });
  };

  return syncState({
    storageKey: urlStorageKey,
    stateContainer: {
      ...stateContainer,
      set: setWithDefaults,
    },
    stateStorage: {
      ...urlStateStorage,
      set: <T,>(key: string, state: T) => urlStateStorage.set(key, state, { replace }),
    },
  });
};

const useUrlStateSyncEffect = (
  stateContainer: AlertSearchBarStateContainer,
  urlStorageKey: string,
  replace: boolean = true
) => {
  const history = useHistory();
  const {
    data: {
      query: {
        timefilter: { timefilter: timeFilterService },
      },
    },
  } = useKibana().services;

  useEffect(() => {
    const urlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    });
    const { start, stop } = setupUrlStateSync(
      stateContainer,
      urlStateStorage,
      urlStorageKey,
      replace
    );

    start();

    syncUrlStateWithInitialContainerState(
      timeFilterService,
      stateContainer,
      urlStateStorage,
      urlStorageKey,
      replace
    );

    return stop;
  }, [stateContainer, history, timeFilterService, urlStorageKey, replace]);
};

export const alertSearchBarState = t.partial({
  rangeFrom: datemathStringRt,
  rangeTo: datemathStringRt,
  kuery: t.string,
});

const syncUrlStateWithInitialContainerState = (
  timeFilterService: TimefilterContract,
  stateContainer: AlertSearchBarStateContainer,
  urlStateStorage: IKbnUrlStateStorage,
  urlStorageKey: string,
  replace: boolean = true
) => {
  const urlState = alertSearchBarState.decode(
    urlStateStorage.get<Partial<AlertSearchBarContainerState>>(urlStorageKey)
  );

  if (isRight(urlState)) {
    const newState = {
      ...defaultState,
      ...pipe(urlState).right,
    };

    stateContainer.set(newState);
    urlStateStorage.set(urlStorageKey, stateContainer.get(), {
      replace: true,
    });
    return;
  } else if (timeFilterService.isTimeTouched()) {
    const { from, to } = timeFilterService.getTime();
    const newState = {
      ...defaultState,
      rangeFrom: from,
      rangeTo: to,
    };
    stateContainer.set(newState);
  } else {
    // Reset the state container when no URL state or timefilter range is set to avoid accidentally
    // re-using state set on a previous visit to the page in the same session
    stateContainer.set(defaultState);
  }

  urlStateStorage.set(urlStorageKey, stateContainer.get(), {
    replace,
  });
};
