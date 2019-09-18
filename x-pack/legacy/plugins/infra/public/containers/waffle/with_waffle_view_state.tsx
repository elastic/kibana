/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { StaticIndexPattern } from 'ui/index_patterns';
import {
  State,
  waffleOptionsActions,
  waffleOptionsSelectors,
  waffleTimeSelectors,
  waffleTimeActions,
  waffleFilterActions,
  waffleFilterSelectors,
} from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { convertKueryToElasticSearchQuery } from '../../utils/kuery';
import { FilterQuery } from '../../store/local/waffle_filter';

const selectViewState = createSelector(
  waffleOptionsSelectors.selectMetric,
  waffleOptionsSelectors.selectView,
  waffleOptionsSelectors.selectGroupBy,
  waffleOptionsSelectors.selectNodeType,
  waffleOptionsSelectors.selectCustomOptions,
  waffleOptionsSelectors.selectBoundsOverride,
  waffleOptionsSelectors.selectAutoBounds,
  waffleTimeSelectors.selectCurrentTime,
  waffleTimeSelectors.selectIsAutoReloading,
  waffleFilterSelectors.selectWaffleFilterQuery,
  (
    metric,
    view,
    groupBy,
    nodeType,
    customOptions,
    boundsOverride,
    autoBounds,
    time,
    autoReload,
    filterQuery
  ) => ({
    time,
    autoReload,
    metric,
    groupBy,
    nodeType,
    view,
    customOptions,
    boundsOverride,
    autoBounds,
    filterQuery,
  })
);

interface Props {
  indexPattern: StaticIndexPattern;
}

export const withWaffleViewState = connect(
  (state: State) => ({
    viewState: selectViewState(state),
  }),
  (dispatch, ownProps: Props) =>
    bindPlainActionCreators({
      changeMetric: waffleOptionsActions.changeMetric,
      changeGroupBy: waffleOptionsActions.changeGroupBy,
      changeNodeType: waffleOptionsActions.changeNodeType,
      changeView: waffleOptionsActions.changeView,
      changeCustomOptions: waffleOptionsActions.changeCustomOptions,
      changeBoundsOverride: waffleOptionsActions.changeBoundsOverride,
      changeAutoBounds: waffleOptionsActions.changeAutoBounds,
      jumpToTime: waffleTimeActions.jumpToTime,
      startAutoReload: waffleTimeActions.startAutoReload,
      stopAutoReload: waffleTimeActions.stopAutoReload,
      applyFilterQuery: (query: FilterQuery) =>
        waffleFilterActions.applyWaffleFilterQuery({
          query,
          serializedQuery: convertKueryToElasticSearchQuery(
            query.expression,
            ownProps.indexPattern
          ),
        }),
    })
);

export const WithWaffleViewState = asChildFunctionRenderer(withWaffleViewState);

/**
 * View State
 */
export interface WaffleViewState {
  metric?: ReturnType<typeof waffleOptionsSelectors.selectMetric>;
  groupBy?: ReturnType<typeof waffleOptionsSelectors.selectGroupBy>;
  nodeType?: ReturnType<typeof waffleOptionsSelectors.selectNodeType>;
  view?: ReturnType<typeof waffleOptionsSelectors.selectView>;
  customOptions?: ReturnType<typeof waffleOptionsSelectors.selectCustomOptions>;
  bounds?: ReturnType<typeof waffleOptionsSelectors.selectBoundsOverride>;
  auto?: ReturnType<typeof waffleOptionsSelectors.selectAutoBounds>;
  time?: ReturnType<typeof waffleTimeSelectors.selectCurrentTime>;
  autoReload?: ReturnType<typeof waffleTimeSelectors.selectIsAutoReloading>;
  filterQuery?: ReturnType<typeof waffleFilterSelectors.selectWaffleFilterQuery>;
}
