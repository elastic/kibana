/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useMemo } from 'react';
import createContainer from 'constate';
import { esKuery } from '../../../../../../../../src/plugins/data/public';

export interface KueryFilterQuery {
  kind: 'kuery';
  expression: string;
}

export interface SerializedFilterQuery {
  query: KueryFilterQuery;
  serializedQuery: string;
}

interface LogFilterInternalStateParams {
  filterQuery: SerializedFilterQuery | null;
  filterQueryDraft: KueryFilterQuery | null;
}

export const logFilterInitialState: LogFilterInternalStateParams = {
  filterQuery: null,
  filterQueryDraft: null,
};

export type LogFilterStateParams = Omit<LogFilterInternalStateParams, 'filterQuery'> & {
  filterQuery: SerializedFilterQuery['serializedQuery'] | null;
  filterQueryAsKuery: SerializedFilterQuery['query'] | null;
  isFilterQueryDraftValid: boolean;
};
export interface LogFilterCallbacks {
  setLogFilterQueryDraft: (payload: KueryFilterQuery) => void;
  applyLogFilterQuery: (payload: SerializedFilterQuery) => void;
}

export const useLogFilterState: () => [LogFilterStateParams, LogFilterCallbacks] = () => {
  const [state, setState] = useState(logFilterInitialState);
  const callbacks = useMemo(
    () => ({
      setLogFilterQueryDraft: (payload: KueryFilterQuery) =>
        setState({ ...state, filterQueryDraft: payload }),

      applyLogFilterQuery: (payload: SerializedFilterQuery) =>
        setState({ ...state, filterQueryDraft: payload.query, filterQuery: payload }),
    }),
    []
  );

  const isFilterQueryDraftValid = useMemo(() => {
    const { filterQueryDraft } = state;
    if (filterQueryDraft && filterQueryDraft.kind === 'kuery') {
      try {
        esKuery.fromKueryExpression(filterQueryDraft.expression);
      } catch (err) {
        return false;
      }
    }

    return true;
  }, [esKuery.fromKueryExpression, state.filterQueryDraft]);

  const serializedFilterQuery = useMemo(
    () => (state.filterQuery ? state.filterQuery.serializedQuery : null),
    [esKuery.fromKueryExpression, state.filterQuery]
  );

  return [
    {
      ...state,
      filterQueryAsKuery: state.filterQuery ? state.filterQuery.query : null,
      filterQuery: serializedFilterQuery,
      isFilterQueryDraftValid,
    },
    callbacks,
  ];
};

export const LogFilterState = createContainer(useLogFilterState);
