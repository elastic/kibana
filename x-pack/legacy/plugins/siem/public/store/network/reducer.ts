/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  Direction,
  DomainsFields,
  FlowDirection,
  FlowTarget,
  NetworkDnsFields,
  NetworkTopNFlowFields,
  TlsFields,
  UsersFields,
} from '../../graphql/types';
import { DEFAULT_TABLE_LIMIT } from '../constants';

import {
  applyNetworkFilterQuery,
  setNetworkFilterQueryDraft,
  updateDnsLimit,
  updateDnsSort,
  updateDomainsFlowDirection,
  updateDomainsLimit,
  updateTlsLimit,
  updateDomainsSort,
  updateIpDetailsFlowTarget,
  updateIsPtrIncluded,
  updateTopNFlowDirection,
  updateTopNFlowLimit,
  updateTopNFlowSort,
  updateTopNFlowTarget,
  updateTlsSort,
  updateUsersLimit,
  updateUsersSort,
} from './actions';
import { helperUpdateTopNFlowDirection } from './helper';
import { NetworkModel, NetworkType } from './model';

export type NetworkState = NetworkModel;

export const initialNetworkState: NetworkState = {
  page: {
    queries: {
      topNFlow: {
        limit: DEFAULT_TABLE_LIMIT,
        topNFlowSort: {
          field: NetworkTopNFlowFields.bytes,
          direction: Direction.desc,
        },
        flowTarget: FlowTarget.source,
        flowDirection: FlowDirection.uniDirectional,
      },
      dns: {
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
      domains: {
        flowDirection: FlowDirection.uniDirectional,
        limit: DEFAULT_TABLE_LIMIT,
        domainsSortField: {
          field: DomainsFields.bytes,
          direction: Direction.desc,
        },
      },
      tls: {
        limit: DEFAULT_TABLE_LIMIT,
        tlsSortField: {
          field: TlsFields._id,
          direction: Direction.desc,
        },
      },
      users: {
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
  .case(updateDnsLimit, (state, { limit, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        dns: {
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
        dns: {
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
        dns: {
          ...state[NetworkType.page].queries.dns,
          isPtrIncluded,
        },
      },
    },
  }))
  .case(updateTopNFlowLimit, (state, { limit, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        topNFlow: {
          ...state[NetworkType.page].queries.topNFlow,
          limit,
        },
      },
    },
  }))
  .case(updateTopNFlowDirection, (state, { flowDirection, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        topNFlow: {
          ...state[NetworkType.page].queries.topNFlow,
          ...helperUpdateTopNFlowDirection(
            state[NetworkType.page].queries.topNFlow.flowTarget,
            flowDirection
          ),
        },
      },
    },
  }))
  .case(updateTopNFlowSort, (state, { topNFlowSort, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        topNFlow: {
          ...state[NetworkType.page].queries.topNFlow,
          topNFlowSort,
        },
      },
    },
  }))
  .case(updateTopNFlowTarget, (state, { flowTarget }) => ({
    ...state,
    [NetworkType.page]: {
      ...state[NetworkType.page],
      queries: {
        ...state[NetworkType.page].queries,
        topNFlow: {
          ...state[NetworkType.page].queries.topNFlow,
          flowTarget,
          topNFlowSort: {
            field: NetworkTopNFlowFields.bytes,
            direction: Direction.desc,
          },
        },
      },
    },
  }))
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
  .case(updateDomainsLimit, (state, { limit }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        domains: {
          ...state[NetworkType.details].queries.domains,
          limit,
        },
      },
    },
  }))
  .case(updateTlsLimit, (state, { limit }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        tls: {
          ...state[NetworkType.details].queries.tls,
          limit,
        },
      },
    },
  }))
  .case(updateDomainsFlowDirection, (state, { flowDirection }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        domains: {
          ...state[NetworkType.details].queries.domains,
          flowDirection,
        },
      },
    },
  }))
  .case(updateDomainsSort, (state, { domainsSortField }) => ({
    ...state,
    [NetworkType.details]: {
      ...state[NetworkType.details],
      queries: {
        ...state[NetworkType.details].queries,
        domains: {
          ...state[NetworkType.details].queries.domains,
          domainsSortField,
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
        tls: {
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
        users: {
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
        users: {
          ...state[NetworkType.details].queries.users,
          usersSortField,
        },
      },
    },
  }))
  .build();
