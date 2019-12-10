/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { IIndexPattern } from 'src/plugins/data/public';
import { LogFilterState, LogFilterStateParams, FilterQuery } from './log_filter';

import { convertKueryToElasticSearchQuery } from '../../utils/kuery';
import { RendererFunction } from '../../utils/typed_react';
import { replaceStateKeyInQueryString, UrlStateContainer } from '../../utils/url_state';

interface WithLogFilterProps {
  indexPattern: IIndexPattern;
  children: RendererFunction<
    LogFilterStateParams & {
      applyFilterQuery: (query: FilterQuery) => void;
      applyFilterQueryFromKueryExpression: (expression: string) => void;
      setFilterQueryDraft: (expression: FilterQuery) => void;
      setFilterQueryDraftFromKueryExpression: (expression: string) => void;
    }
  >;
}

export const WithLogFilter: React.FC<WithLogFilterProps> = ({ children, indexPattern }) => {
  const [logFilterState, logFilterCallbacks] = useContext(LogFilterState.Context);
  return children({
    ...logFilterState,
    applyFilterQuery: (query: FilterQuery) =>
      logFilterCallbacks.applyLogFilterQuery({
        query,
        serializedQuery: convertKueryToElasticSearchQuery(query.expression, indexPattern),
      }),
    applyFilterQueryFromKueryExpression: (expression: string) =>
      logFilterCallbacks.applyLogFilterQuery({
        query: {
          kind: 'kuery',
          expression,
        },
        serializedQuery: convertKueryToElasticSearchQuery(expression, indexPattern),
      }),
    setFilterQueryDraft: logFilterCallbacks.setLogFilterQueryDraft,
    setFilterQueryDraftFromKueryExpression: (expression: string) =>
      logFilterCallbacks.setLogFilterQueryDraft({
        kind: 'kuery',
        expression,
      }),
  });
};

/**
 * Url State
 */

type LogFilterUrlState = LogFilterStateParams['filterQuery'];

type WithLogFilterUrlStateProps = Omit<WithLogFilterProps, 'children'>;

export const WithLogFilterUrlState: React.FC<WithLogFilterUrlStateProps> = ({ indexPattern }) => (
  <WithLogFilter indexPattern={indexPattern}>
    {({ applyFilterQuery, filterQuery }) => (
      <UrlStateContainer
        urlState={filterQuery}
        urlStateKey="logFilter"
        mapToUrlState={mapToFilterQuery}
        onChange={urlState => {
          if (urlState) {
            applyFilterQuery(urlState);
          }
        }}
        onInitialize={urlState => {
          if (urlState) {
            applyFilterQuery(urlState);
          }
        }}
      />
    )}
  </WithLogFilter>
);

const mapToFilterQuery = (value: any): LogFilterUrlState | undefined =>
  value && value.kind === 'kuery' && typeof value.expression === 'string'
    ? {
        kind: value.kind,
        expression: value.expression,
      }
    : undefined;

export const replaceLogFilterInQueryString = (expression: string) =>
  replaceStateKeyInQueryString<LogFilterUrlState>('logFilter', {
    kind: 'kuery',
    expression,
  });
