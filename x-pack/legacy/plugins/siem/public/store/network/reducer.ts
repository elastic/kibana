/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { get } from 'lodash/fp';
import {
  Direction,
  FlowTarget,
  NetworkDnsFields,
  NetworkTopTablesFields,
  TlsFields,
  UsersFields,
} from '../../graphql/types';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../constants';

import {
  setIpDetailsTablesActivePageToZero,
  setNetworkTablesActivePageToZero,
  updateIpDetailsFlowTarget,
  updateNetworkTable,
} from './actions';
import {
  setNetworkDetailsQueriesActivePageToZero,
  setNetworkPageQueriesActivePageToZero,
} from './helpers';
import { IpDetailsTableType, NetworkModel, NetworkTableType, NetworkType } from './model';

export type NetworkState = NetworkModel;

export const initialNetworkState: NetworkState = {
  page: {
    queries: {
      [NetworkTableType.topNFlowSource]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.topNFlowDestination]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_in,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.dns]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkDnsFields.uniqueDomains,
          direction: Direction.desc,
        },
        isPtrIncluded: false,
      },
      [NetworkTableType.http]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          direction: Direction.desc,
        },
      },
      [NetworkTableType.tls]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: TlsFields._id,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.topCountriesSource]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.topCountriesDestination]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_in,
          direction: Direction.desc,
        },
      },
    },
  },
  details: {
    queries: {
      [IpDetailsTableType.http]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.topCountriesSource]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.topCountriesDestination]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_in,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.topNFlowSource]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.topNFlowDestination]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_in,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.tls]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: TlsFields._id,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.users]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: UsersFields.name,
          direction: Direction.asc,
        },
      },
    },
    flowTarget: FlowTarget.source,
  },
};

export const networkReducer = reducerWithInitialState(initialNetworkState)
  .case(updateNetworkTable, (state, { networkType, tableType, updates }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        [tableType]: {
          ...get([networkType, 'queries', tableType], state),
          ...updates,
        },
      },
    },
  }))
  .case(setNetworkTablesActivePageToZero, state => ({
    ...state,
    page: {
      ...state.page,
      queries: setNetworkPageQueriesActivePageToZero(state),
    },
    details: {
      ...state.details,
      queries: setNetworkDetailsQueriesActivePageToZero(state),
    },
  }))
  .case(setIpDetailsTablesActivePageToZero, state => ({
    ...state,
    details: {
      ...state.details,
      queries: setNetworkDetailsQueriesActivePageToZero(state),
    },
  }))
  .case(updateIpDetailsFlowTarget, (state, { flowTarget }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      flowTarget,
    },
  }))
  .build();
