/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { State } from '../reducer';

import { IpDetailsTableType, NetworkDetailsModel, NetworkPageModel, NetworkType } from './model';
import { FlowTargetSourceDest } from '../../graphql/types';

const selectNetworkPage = (state: State): NetworkPageModel => state.network.page;

const selectNetworkDetails = (state: State): NetworkDetailsModel => state.network.details;

// Network Page Selectors
export const dnsSelector = () =>
  createSelector(
    selectNetworkPage,
    network => network.queries.dns
  );
export enum NetworkTableType {
  tls = 'tls',
  dns = 'dns',
  topCountriesDestination = 'topCountriesDestination',
  topCountriesSource = 'topCountriesSource',
  topNFlowDestination = 'topNFlowDestination',
  topNFlowSource = 'topNFlowSource',
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

export const topCountriesSelector = (
  flowTarget: FlowTargetSourceDest,
  networkType: NetworkType
) => {
  if (networkType === NetworkType.page) {
    return createSelector(
      selectNetworkPage,
      network =>
        flowTarget === FlowTargetSourceDest.source
          ? network.queries[NetworkTableType.topCountriesSource]
          : network.queries[NetworkTableType.topCountriesDestination]
    );
  }
  return createSelector(
    selectNetworkDetails,
    network =>
      flowTarget === FlowTargetSourceDest.source
        ? network.queries[IpDetailsTableType.topCountriesSource]
        : network.queries[IpDetailsTableType.topCountriesDestination]
  );
};

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
