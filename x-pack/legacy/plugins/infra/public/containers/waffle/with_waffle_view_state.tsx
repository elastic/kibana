/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { IIndexPattern } from 'src/plugins/data/public';
import {
  State,
  waffleOptionsActions,
  waffleOptionsSelectors,
  waffleTimeSelectors,
  waffleTimeActions,
  waffleFilterActions,
  waffleFilterSelectors,
  initialState,
} from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { convertKueryToElasticSearchQuery } from '../../utils/kuery';

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
  indexPattern: IIndexPattern;
}

export const withWaffleViewState = connect(
  (state: State) => ({
    viewState: selectViewState(state),
    defaultViewState: selectViewState(initialState),
  }),
  (dispatch, ownProps: Props) => {
    return {
      onViewChange: (viewState: WaffleViewState) => {
        if (viewState.time) {
          dispatch(waffleTimeActions.jumpToTime(viewState.time));
        }
        if (viewState.autoReload) {
          dispatch(waffleTimeActions.startAutoReload());
        } else if (typeof viewState.autoReload !== 'undefined' && !viewState.autoReload) {
          dispatch(waffleTimeActions.stopAutoReload());
        }
        if (viewState.metric) {
          dispatch(waffleOptionsActions.changeMetric(viewState.metric));
        }
        if (viewState.groupBy) {
          dispatch(waffleOptionsActions.changeGroupBy(viewState.groupBy));
        }
        if (viewState.nodeType) {
          dispatch(waffleOptionsActions.changeNodeType(viewState.nodeType));
        }
        if (viewState.view) {
          dispatch(waffleOptionsActions.changeView(viewState.view));
        }
        if (viewState.customOptions) {
          dispatch(waffleOptionsActions.changeCustomOptions(viewState.customOptions));
        }
        if (viewState.boundsOverride) {
          dispatch(waffleOptionsActions.changeBoundsOverride(viewState.boundsOverride));
        }
        if (viewState.autoBounds) {
          dispatch(waffleOptionsActions.changeAutoBounds(viewState.autoBounds));
        }
        if (viewState.filterQuery) {
          dispatch(
            waffleFilterActions.applyWaffleFilterQuery({
              query: viewState.filterQuery,
              serializedQuery: convertKueryToElasticSearchQuery(
                viewState.filterQuery.expression,
                ownProps.indexPattern
              ),
            })
          );
        } else {
          dispatch(
            waffleFilterActions.applyWaffleFilterQuery({
              query: null,
              serializedQuery: null,
            })
          );
        }
      },
    };
  }
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
  boundsOverride?: ReturnType<typeof waffleOptionsSelectors.selectBoundsOverride>;
  autoBounds?: ReturnType<typeof waffleOptionsSelectors.selectAutoBounds>;
  time?: ReturnType<typeof waffleTimeSelectors.selectCurrentTime>;
  autoReload?: ReturnType<typeof waffleTimeSelectors.selectIsAutoReloading>;
  filterQuery?: ReturnType<typeof waffleFilterSelectors.selectWaffleFilterQuery>;
}
