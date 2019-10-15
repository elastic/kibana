/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { createSelector } from 'reselect';

import { isFromKueryExpressionValid } from '../../lib/keury';
import { State } from '../reducer';

import { IpDetailsTableType, NetworkDetailsModel, NetworkPageModel, NetworkType } from './model';
import { FlowTargetSourceDest } from '../../graphql/types';

const selectNetworkPage = (state: State): NetworkPageModel => state.network.page;

const selectNetworkDetails = (state: State): NetworkDetailsModel => state.network.details;

const selectNetworkByType = (state: State, networkType: NetworkType) =>
  get(networkType, state.network);

// Network Page Selectors
export const dnsSelector = () =>
  createSelector(
    selectNetworkPage,
    network => network.queries.dns
  );
export enum NetworkTableType {
  tls = 'tls',
  dns = 'dns',
  topNFlowSource = 'topNFlowSource',
  topNFlowDestination = 'topNFlowDestination',
}

export const topNFlowSelector = (flowTarget: FlowTargetSourceDest, networkType: NetworkType) => {
  if (networkType === NetworkType.page) {
    return createSelector(
      selectNetworkPage,
      network =>
        flowTarget === FlowTargetSourceDest.source
          ? network.queries[NetworkTableType.topNFlowSource]
          : network.queries[NetworkTableType.topNFlowDestination]
    );
  }
  return createSelector(
    selectNetworkDetails,
    network =>
      flowTarget === FlowTargetSourceDest.source
        ? network.queries[IpDetailsTableType.topNFlowSource]
        : network.queries[IpDetailsTableType.topNFlowDestination]
  );
};

export const tlsSelector = (networkType: NetworkType) => {
  if (networkType === NetworkType.page) {
    return createSelector(
      selectNetworkPage,
      network => network.queries[NetworkTableType.tls]
    );
  }

  return createSelector(
    selectNetworkDetails,
    network => network.queries[IpDetailsTableType.tls]
  );
};

// Filter Query Selectors
export const networkFilterQueryAsJson = () =>
  createSelector(
    selectNetworkByType,
    network => (network.filterQuery ? network.filterQuery.serializedQuery : null)
  );

export const networkFilterExpression = () =>
  createSelector(
    selectNetworkByType,
    network =>
      network.filterQuery && network.filterQuery.kuery ? network.filterQuery.kuery.expression : null
  );

export const networkFilterQueryAsKuery = () =>
  createSelector(
    selectNetworkByType,
    network => (network.filterQuery && network.filterQuery.kuery ? network.filterQuery.kuery : null)
  );

export const networkFilterQueryDraft = () =>
  createSelector(
    selectNetworkByType,
    network => network.filterQueryDraft
  );

export const isNetworkFilterQueryDraftValid = () =>
  createSelector(
    selectNetworkByType,
    network => isFromKueryExpressionValid(network.filterQueryDraft)
  );

// IP Details Selectors
export const ipDetailsFlowTargetSelector = () =>
  createSelector(
    selectNetworkDetails,
    network => network.flowTarget
  );

export const usersSelector = () =>
  createSelector(
    selectNetworkDetails,
    network => network.queries.users
  );
