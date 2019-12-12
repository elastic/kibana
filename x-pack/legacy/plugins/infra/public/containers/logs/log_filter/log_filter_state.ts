/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useMemo } from 'react';
import createContainer from 'constate';
import { IIndexPattern } from 'src/plugins/data/public';
import { esKuery } from '../../../../../../../../src/plugins/data/public';
import { convertKueryToElasticSearchQuery } from '../../../utils/kuery';

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
  setLogFilterQueryDraft: (expression: string) => void;
  applyLogFilterQuery: (expression: string) => void;
}

export const useLogFilterState: (props: {
  indexPattern: IIndexPattern;
}) => [LogFilterStateParams, LogFilterCallbacks] = ({ indexPattern }) => {
  const [state, setState] = useState(logFilterInitialState);
  const { filterQuery, filterQueryDraft } = state;

  const callbacks: LogFilterCallbacks = useMemo(() => {
    const setLogFilterQueryDraft = (payload: KueryFilterQuery) =>
      setState({ ...state, filterQueryDraft: payload });
    const applyLogFilterQuery = (payload: SerializedFilterQuery) =>
      setState({ ...state, filterQueryDraft: payload.query, filterQuery: payload });
    return {
      setLogFilterQueryDraft: expression =>
        setLogFilterQueryDraft({
          kind: 'kuery',
          expression,
        }),
      applyLogFilterQuery: expression =>
        applyLogFilterQuery({
          query: {
            kind: 'kuery',
            expression,
          },
          serializedQuery: convertKueryToElasticSearchQuery(expression, indexPattern),
        }),
    };
  }, [state, indexPattern]);

  const isFilterQueryDraftValid = useMemo(() => {
    if (filterQueryDraft && filterQueryDraft.kind === 'kuery') {
      try {
        esKuery.fromKueryExpression(filterQueryDraft.expression);
      } catch (err) {
        return false;
      }
    }

    return true;
  }, [filterQueryDraft]);

  const serializedFilterQuery = useMemo(() => (filterQuery ? filterQuery.serializedQuery : null), [
    filterQuery,
  ]);

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
