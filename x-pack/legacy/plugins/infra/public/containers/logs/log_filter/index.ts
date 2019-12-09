/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer, useMemo } from 'react';
import createContainer from 'constate';
import { esKuery } from '../../../../../../../../src/plugins/data/public';

enum Action {
  SetDraftFilterQuery,
  ApplyFilterQuery,
}

interface SetDraftQueryAction {
  type: Action.SetDraftFilterQuery;
  payload: FilterQuery | null;
}

interface ApplyFilterQueryAction {
  type: Action.ApplyFilterQuery;
  payload: SerializedFilterQuery;
}

type ActionObj = SetDraftQueryAction | ApplyFilterQueryAction;

export interface KueryFilterQuery {
  kind: 'kuery';
  expression: string;
}

export type FilterQuery = KueryFilterQuery;

export interface SerializedFilterQuery {
  query: FilterQuery;
  serializedQuery: string;
}

interface LogFilterBaseStateParams {
  filterQuery: SerializedFilterQuery | null;
  filterQueryDraft: KueryFilterQuery | null;
}

export const logFilterInitialState: LogFilterBaseStateParams = {
  filterQuery: null,
  filterQueryDraft: null,
};

interface LogFilterDerivatives {
  isFilterQueryDraftValid: boolean;
  filterQueryAsJson: SerializedFilterQuery['serializedQuery'] | null;
  filterQuery: FilterQuery | null;
}

export type LogFilterStateParams = Omit<LogFilterBaseStateParams, 'filterQuery'> &
  LogFilterDerivatives;

export interface LogFilterCallbacks {
  setLogFilterQueryDraft: (payload: FilterQuery) => void;
  applyLogFilterQuery: (payload: SerializedFilterQuery) => void;
}

const getDerivatives = (state: LogFilterBaseStateParams) => ({
  get isFilterQueryDraftValid() {
    const { filterQueryDraft } = state;
    if (filterQueryDraft && filterQueryDraft.kind === 'kuery') {
      try {
        esKuery.fromKueryExpression(filterQueryDraft.expression);
      } catch (err) {
        return false;
      }
    }

    return true;
  },
  get filterQueryAsJson() {
    const { filterQuery } = state;
    return filterQuery ? filterQuery.serializedQuery : null;
  },
  get filterQuery() {
    const { filterQuery } = state;
    return filterQuery ? filterQuery.query : null;
  },
});

export const useLogFilterState: () => [LogFilterStateParams, LogFilterCallbacks] = () => {
  const [state, dispatch] = useReducer(logFilterStateReducer, logFilterInitialState);

  const callbacks = useMemo(
    () => ({
      setLogFilterQueryDraft: (payload: FilterQuery) =>
        dispatch({ type: Action.SetDraftFilterQuery, payload }),

      applyLogFilterQuery: (payload: SerializedFilterQuery) =>
        dispatch({ type: Action.ApplyFilterQuery, payload }),
    }),
    []
  );

  const derivatives = useMemo(() => getDerivatives(state), [state]);

  return [{ ...state, ...derivatives }, callbacks];
};

const logFilterStateReducer = (prevState: LogFilterBaseStateParams, action: ActionObj) => {
  switch (action.type) {
    case Action.SetDraftFilterQuery:
      return { ...prevState, filterQueryDraft: action.payload };
    case Action.ApplyFilterQuery:
      return { ...prevState, filterQueryDraft: action.payload.query, filterQuery: action.payload };
    default:
      throw new Error();
  }
};

export const LogFilterState = createContainer(useLogFilterState);
