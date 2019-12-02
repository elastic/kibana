/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { isBoolean, isNumber } from 'lodash';
import {
  InfraSnapshotMetricInput,
  InfraSnapshotMetricType,
  InfraNodeType,
  InfraSnapshotGroupbyInput,
} from '../../graphql/types';
import { InfraGroupByOptions } from '../../lib/lib';
import { State, waffleOptionsActions, waffleOptionsSelectors } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { UrlStateContainer } from '../../utils/url_state';

const selectOptionsUrlState = createSelector(
  waffleOptionsSelectors.selectMetric,
  waffleOptionsSelectors.selectView,
  waffleOptionsSelectors.selectGroupBy,
  waffleOptionsSelectors.selectNodeType,
  waffleOptionsSelectors.selectCustomOptions,
  waffleOptionsSelectors.selectBoundsOverride,
  waffleOptionsSelectors.selectAutoBounds,
  (metric, view, groupBy, nodeType, customOptions, boundsOverride, autoBounds) => ({
    metric,
    groupBy,
    nodeType,
    view,
    customOptions,
    boundsOverride,
    autoBounds,
  })
);

export const withWaffleOptions = connect(
  (state: State) => ({
    metric: waffleOptionsSelectors.selectMetric(state),
    groupBy: waffleOptionsSelectors.selectGroupBy(state),
    nodeType: waffleOptionsSelectors.selectNodeType(state),
    view: waffleOptionsSelectors.selectView(state),
    customOptions: waffleOptionsSelectors.selectCustomOptions(state),
    boundsOverride: waffleOptionsSelectors.selectBoundsOverride(state),
    autoBounds: waffleOptionsSelectors.selectAutoBounds(state),
    urlState: selectOptionsUrlState(state),
  }),
  bindPlainActionCreators({
    changeMetric: waffleOptionsActions.changeMetric,
    changeGroupBy: waffleOptionsActions.changeGroupBy,
    changeNodeType: waffleOptionsActions.changeNodeType,
    changeView: waffleOptionsActions.changeView,
    changeCustomOptions: waffleOptionsActions.changeCustomOptions,
    changeBoundsOverride: waffleOptionsActions.changeBoundsOverride,
    changeAutoBounds: waffleOptionsActions.changeAutoBounds,
  })
);

export const WithWaffleOptions = asChildFunctionRenderer(withWaffleOptions);

/**
 * Url State
 */

interface WaffleOptionsUrlState {
  metric?: ReturnType<typeof waffleOptionsSelectors.selectMetric>;
  groupBy?: ReturnType<typeof waffleOptionsSelectors.selectGroupBy>;
  nodeType?: ReturnType<typeof waffleOptionsSelectors.selectNodeType>;
  view?: ReturnType<typeof waffleOptionsSelectors.selectView>;
  customOptions?: ReturnType<typeof waffleOptionsSelectors.selectCustomOptions>;
  bounds?: ReturnType<typeof waffleOptionsSelectors.selectBoundsOverride>;
  auto?: ReturnType<typeof waffleOptionsSelectors.selectAutoBounds>;
}

export const WithWaffleOptionsUrlState = () => (
  <WithWaffleOptions>
    {({
      changeMetric,
      urlState,
      changeGroupBy,
      changeNodeType,
      changeView,
      changeCustomOptions,
      changeAutoBounds,
      changeBoundsOverride,
    }) => (
      <UrlStateContainer<WaffleOptionsUrlState>
        urlState={urlState}
        urlStateKey="waffleOptions"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.metric) {
            changeMetric(newUrlState.metric);
          }
          if (newUrlState && newUrlState.groupBy) {
            changeGroupBy(newUrlState.groupBy);
          }
          if (newUrlState && newUrlState.nodeType) {
            changeNodeType(newUrlState.nodeType);
          }
          if (newUrlState && newUrlState.view) {
            changeView(newUrlState.view);
          }
          if (newUrlState && newUrlState.customOptions) {
            changeCustomOptions(newUrlState.customOptions);
          }
          if (newUrlState && newUrlState.bounds) {
            changeBoundsOverride(newUrlState.bounds);
          }
          if (newUrlState && newUrlState.auto) {
            changeAutoBounds(newUrlState.auto);
          }
        }}
        onInitialize={initialUrlState => {
          if (initialUrlState && initialUrlState.metric) {
            changeMetric(initialUrlState.metric);
          }
          if (initialUrlState && initialUrlState.groupBy) {
            changeGroupBy(initialUrlState.groupBy);
          }
          if (initialUrlState && initialUrlState.nodeType) {
            changeNodeType(initialUrlState.nodeType);
          }
          if (initialUrlState && initialUrlState.view) {
            changeView(initialUrlState.view);
          }
          if (initialUrlState && initialUrlState.customOptions) {
            changeCustomOptions(initialUrlState.customOptions);
          }
          if (initialUrlState && initialUrlState.bounds) {
            changeBoundsOverride(initialUrlState.bounds);
          }
          if (initialUrlState && initialUrlState.auto) {
            changeAutoBounds(initialUrlState.auto);
          }
        }}
      />
    )}
  </WithWaffleOptions>
);

const mapToUrlState = (value: any): WaffleOptionsUrlState | undefined =>
  value
    ? {
        metric: mapToMetricUrlState(value.metric),
        groupBy: mapToGroupByUrlState(value.groupBy),
        nodeType: mapToNodeTypeUrlState(value.nodeType),
        view: mapToViewUrlState(value.view),
        customOptions: mapToCustomOptionsUrlState(value.customOptions),
        bounds: mapToBoundsOverideUrlState(value.boundsOverride),
        auto: mapToAutoBoundsUrlState(value.autoBounds),
      }
    : undefined;

const isInfraNodeType = (value: any): value is InfraNodeType => value in InfraNodeType;

const isInfraSnapshotMetricInput = (subject: any): subject is InfraSnapshotMetricInput => {
  return subject != null && subject.type in InfraSnapshotMetricType;
};

const isInfraSnapshotGroupbyInput = (subject: any): subject is InfraSnapshotGroupbyInput => {
  return subject != null && subject.type != null;
};

const isInfraGroupByOption = (subject: any): subject is InfraGroupByOptions => {
  return subject != null && subject.text != null && subject.field != null;
};

const mapToMetricUrlState = (subject: any) => {
  return subject && isInfraSnapshotMetricInput(subject) ? subject : undefined;
};

const mapToGroupByUrlState = (subject: any) => {
  return subject && Array.isArray(subject) && subject.every(isInfraSnapshotGroupbyInput)
    ? subject
    : undefined;
};

const mapToNodeTypeUrlState = (subject: any) => {
  return isInfraNodeType(subject) ? subject : undefined;
};

const mapToViewUrlState = (subject: any) => {
  return subject && ['map', 'table'].includes(subject) ? subject : undefined;
};

const mapToCustomOptionsUrlState = (subject: any) => {
  return subject && Array.isArray(subject) && subject.every(isInfraGroupByOption)
    ? subject
    : undefined;
};

const mapToBoundsOverideUrlState = (subject: any) => {
  return subject != null && isNumber(subject.max) && isNumber(subject.min) ? subject : undefined;
};

const mapToAutoBoundsUrlState = (subject: any) => {
  return subject != null && isBoolean(subject) ? subject : undefined;
};
