/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  Direction,
  FlowTarget,
  NetworkDnsFields,
  NetworkTopNFlowFields,
  TlsFields,
  UsersFields,
} from '../../graphql/types';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../constants';

import {
  setNetworkTablesActivePageToZero,
  updateDnsLimit,
  updateDnsSort,
  updateIpDetailsFlowTarget,
  updateIpDetailsTableActivePage,
  updateIsPtrIncluded,
  updateNetworkPageTableActivePage,
  updateTlsLimit,
  updateTlsSort,
  updateTopNFlowLimit,
  updateTopNFlowSort,
  updateUsersLimit,
  updateUsersSort,
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
        topNFlowSort: {
          field: NetworkTopNFlowFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.topNFlowDestination]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        topNFlowSort: {
          field: NetworkTopNFlowFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.dns]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        dnsSortField: {
          field: NetworkDnsFields.uniqueDomains,
          direction: Direction.desc,
        },
        isPtrIncluded: false,
      },
    },
  },
  details: {
    queries: {
      [IpDetailsTableType.topNFlowSource]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        topNFlowSort: {
          field: NetworkTopNFlowFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.topNFlowDestination]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        topNFlowSort: {
          field: NetworkTopNFlowFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.tls]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        tlsSortField: {
          field: TlsFields._id,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.users]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        usersSortField: {
          field: UsersFields.name,
          direction: Direction.asc,
        },
      },
    },
    flowTarget: FlowTarget.source,
  },
};

export const networkReducer = reducerWithInitialState(initialNetworkState)
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
  .case(updateIpDetailsTableActivePage, (state, { activePage, tableType }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        [tableType]: {
          ...state[NetworkType.details].queries[tableType],
          activePage,
        },
      },
    },
  }))
  .case(updateNetworkPageTableActivePage, (state, { activePage, tableType }) => ({
    ...state,
    [NetworkType.page]: {
      ...state[NetworkType.page],
      queries: {
        ...state[NetworkType.page].queries,
        [tableType]: {
          ...state[NetworkType.page].queries[tableType],
          activePage,
        },
      },
    },
  }))
  .case(updateDnsLimit, (state, { limit, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        [NetworkTableType.dns]: {
          ...state[NetworkType.page].queries.dns,
          limit,
        },
      },
    },
  }))
  .case(updateDnsSort, (state, { dnsSortField, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        [NetworkTableType.dns]: {
          ...state[NetworkType.page].queries.dns,
          dnsSortField,
        },
      },
    },
  }))
  .case(updateIsPtrIncluded, (state, { isPtrIncluded, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        [NetworkTableType.dns]: {
          ...state[NetworkType.page].queries.dns,
          isPtrIncluded,
        },
      },
    },
  }))
  .case(updateTopNFlowLimit, (state, { limit, networkType, tableType }) => {
    if (
      networkType === NetworkType.page &&
      (tableType === NetworkTableType.topNFlowSource ||
        tableType === NetworkTableType.topNFlowDestination)
    ) {
      return {
        ...state,
        [networkType]: {
          ...state[networkType],
          queries: {
            ...state[networkType].queries,
            [tableType]: {
              ...state[networkType].queries[tableType],
              limit,
            },
          },
        },
      };
    } else if (
      tableType === IpDetailsTableType.topNFlowDestination ||
      tableType === IpDetailsTableType.topNFlowSource
    ) {
      return {
        ...state,
        [NetworkType.details]: {
          ...state[NetworkType.details],
          queries: {
            ...state[NetworkType.details].queries,
            [tableType]: {
              ...state[NetworkType.details].queries[tableType],
              limit,
            },
          },
        },
      };
    }
    return state;
  })
  .case(updateTopNFlowSort, (state, { topNFlowSort, networkType, tableType }) => {
    if (
      networkType === NetworkType.page &&
      (tableType === NetworkTableType.topNFlowSource ||
        tableType === NetworkTableType.topNFlowDestination)
    ) {
      return {
        ...state,
        [networkType]: {
          ...state[networkType],
          queries: {
            ...state[networkType].queries,
            [tableType]: {
              ...state[networkType].queries[tableType],
              topNFlowSort,
            },
          },
        },
      };
    } else if (
      tableType === IpDetailsTableType.topNFlowDestination ||
      tableType === IpDetailsTableType.topNFlowSource
    ) {
      return {
        ...state,
        [NetworkType.details]: {
          ...state[NetworkType.details],
          queries: {
            ...state[NetworkType.details].queries,
            [tableType]: {
              ...state[NetworkType.details].queries[tableType],
              topNFlowSort,
            },
          },
        },
      };
    }
    return state;
  })
  .case(updateIpDetailsFlowTarget, (state, { flowTarget }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      flowTarget,
    },
  }))
  .case(updateTlsLimit, (state, { limit }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        [IpDetailsTableType.tls]: {
          ...state[NetworkType.details].queries.tls,
          limit,
        },
      },
    },
  }))
  .case(updateTlsSort, (state, { tlsSortField }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        [IpDetailsTableType.tls]: {
          ...state[NetworkType.details].queries.tls,
          tlsSortField,
        },
      },
    },
  }))
  .case(updateUsersLimit, (state, { limit }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        [IpDetailsTableType.users]: {
          ...state[NetworkType.details].queries.users,
          limit,
        },
      },
    },
  }))
  .case(updateUsersSort, (state, { usersSortField }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        [IpDetailsTableType.users]: {
          ...state[NetworkType.details].queries.users,
          usersSortField,
        },
      },
    },
  }))
  .build();
