/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { get } from 'lodash/fp';

import {
  FlowTargetSourceDest,
  NetworkTopTablesFields,
  Direction,
  TlsFields,
} from '../../graphql/types';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../constants';
import { State } from '../reducer';
import {
  IpDetailsTableType,
  NetworkDetailsModel,
  NetworkPageModel,
  NetworkTableType,
  NetworkType,
} from './model';

const selectNetworkPage = (state: State): NetworkPageModel => state.network.page;

const selectNetworkDetails = (state: State): NetworkDetailsModel => state.network.details;

// Network Page Selectors
export const dnsSelector = () =>
  createSelector(
    selectNetworkPage,
    network => network.queries.dns
  );

const selectTopNFlowByType = (
  state: State,
  networkType: NetworkType,
  flowTarget: FlowTargetSourceDest
) => {
  const ft = flowTarget === FlowTargetSourceDest.source ? 'topNFlowSource' : 'topNFlowDestination';
  const nFlowType =
    networkType === NetworkType.page ? NetworkTableType[ft] : IpDetailsTableType[ft];
  return (
    get([networkType, 'queries', nFlowType], state.network) || {
      activePage: DEFAULT_TABLE_ACTIVE_PAGE,
      limit: DEFAULT_TABLE_LIMIT,
      topNFlowSort: {
        field: NetworkTopTablesFields.bytes_out,
        direction: Direction.desc,
      },
    }
  );
};

export const topNFlowSelector = () =>
  createSelector(
    selectTopNFlowByType,
    topNFlowQueries => topNFlowQueries
  );
const selectTlsByType = (state: State, networkType: NetworkType) => {
  const tlsType = networkType === NetworkType.page ? NetworkTableType.tls : IpDetailsTableType.tls;
  return (
    get([networkType, 'queries', tlsType], state.network) || {
      activePage: DEFAULT_TABLE_ACTIVE_PAGE,
      limit: DEFAULT_TABLE_LIMIT,
      tlsSortField: {
        field: TlsFields._id,
        direction: Direction.desc,
      },
    }
  );
};

export const tlsSelector = () =>
  createSelector(
    selectTlsByType,
    tlsQueries => tlsQueries
  );

const selectTopCountriesByType = (
  state: State,
  networkType: NetworkType,
  flowTarget: FlowTargetSourceDest
) => {
  const ft =
    flowTarget === FlowTargetSourceDest.source ? 'topCountriesSource' : 'topCountriesDestination';
  const nFlowType =
    networkType === NetworkType.page ? NetworkTableType[ft] : IpDetailsTableType[ft];
  return (
    get([networkType, 'queries', nFlowType], state.network) || {
      activePage: DEFAULT_TABLE_ACTIVE_PAGE,
      limit: DEFAULT_TABLE_LIMIT,
      topCountriesSort: {
        field: NetworkTopTablesFields.bytes_out,
        direction: Direction.desc,
      },
    }
  );
};

export const topCountriesSelector = () =>
  createSelector(
    selectTopCountriesByType,
    topCountriesQueries => topCountriesQueries
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
