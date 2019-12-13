/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';

import { IIndexPattern } from 'src/plugins/data/public';
import { logFilterActions, logFilterSelectors, State } from '../../store';
import { FilterQuery } from '../../store/local/log_filter';
import { convertKueryToElasticSearchQuery } from '../../utils/kuery';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { replaceStateKeyInQueryString, UrlStateContainer } from '../../utils/url_state';

interface WithLogFilterProps {
  indexPattern: IIndexPattern;
}

export const withLogFilter = connect(
  (state: State) => ({
    filterQuery: logFilterSelectors.selectLogFilterQuery(state),
    serializedFilterQuery: logFilterSelectors.selectLogFilterQueryAsJson(state),
    filterQueryDraft: logFilterSelectors.selectLogFilterQueryDraft(state),
    isFilterQueryDraftValid: logFilterSelectors.selectIsLogFilterQueryDraftValid(state),
  }),
  (dispatch, ownProps: WithLogFilterProps) =>
    bindPlainActionCreators({
      applyFilterQuery: (query: FilterQuery) =>
        logFilterActions.applyLogFilterQuery({
          query,
          serializedQuery: convertKueryToElasticSearchQuery(
            query.expression,
            ownProps.indexPattern
          ),
        }),
      applyFilterQueryFromKueryExpression: (expression: string) =>
        logFilterActions.applyLogFilterQuery({
          query: {
            kind: 'kuery',
            expression,
          },
          serializedQuery: convertKueryToElasticSearchQuery(expression, ownProps.indexPattern),
        }),
      setFilterQueryDraft: logFilterActions.setLogFilterQueryDraft,
      setFilterQueryDraftFromKueryExpression: (expression: string) =>
        logFilterActions.setLogFilterQueryDraft({
          kind: 'kuery',
          expression,
        }),
    })(dispatch)
);

export const WithLogFilter = asChildFunctionRenderer(withLogFilter);

/**
 * Url State
 */

type LogFilterUrlState = ReturnType<typeof logFilterSelectors.selectLogFilterQuery>;

type WithLogFilterUrlStateProps = WithLogFilterProps;

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
