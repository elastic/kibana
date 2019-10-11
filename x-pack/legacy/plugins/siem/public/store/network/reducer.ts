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
  applyNetworkFilterQuery,
  setNetworkFilterQueryDraft,
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
import { IpDetailsTableType, NetworkModel, NetworkTableType, NetworkType } from './model';
import {
  setNetworkDetailsQueriesActivePageToZero,
  setNetworkPageQueriesActivePageToZero,
  setNetworkQueriesActivePageToZero,
} from './helpers';

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
    filterQuery: null,
    filterQueryDraft: null,
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
    filterQuery: null,
    filterQueryDraft: null,
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
    if (networkType === NetworkType.page) {
      return {
        ...state,
        [networkType]: {
          ...state[networkType],
          queries: {
            ...state[networkType].queries,
            [tableType]: {
              ...state[NetworkType.page].queries[tableType],
              limit,
            },
          },
        },
      };
    }
    return {
      ...state,
      [networkType]: {
        ...state[networkType],
        queries: {
          ...state[networkType].queries,
          [tableType]: {
            ...state[NetworkType.details].queries[tableType],
            limit,
          },
        },
      },
    };
  })
  .case(updateTopNFlowSort, (state, { topNFlowSort, networkType, tableType }) => {
    if (
      tableType === NetworkTableType.dns ||
      (networkType === NetworkType.page &&
        (tableType === NetworkTableType.topNFlowSource ||
          tableType === NetworkTableType.topNFlowDestination))
    ) {
      return {
        ...state,
        [NetworkType.page]: {
          ...state[NetworkType.page],
          queries: {
            ...state[NetworkType.page].queries,
            [tableType]: {
              ...state[NetworkType.page].queries[tableType],
              topNFlowSort,
            },
          },
        },
      };
    } else {
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
  })
  .case(setNetworkFilterQueryDraft, (state, { filterQueryDraft, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      filterQueryDraft,
    },
  }))
  .case(applyNetworkFilterQuery, (state, { filterQuery, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: setNetworkQueriesActivePageToZero(state, networkType),
      filterQueryDraft: filterQuery.kuery,
      filterQuery,
    },
  }))
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
