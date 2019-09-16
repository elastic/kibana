/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  NetworkTopNFlowFields,
  NetworkDnsFields,
  FlowDirection,
  DomainsFields,
  TlsFields,
  UsersFields,
  FlowTarget,
} from '../../graphql/types';
import { DEFAULT_TABLE_LIMIT } from '../constants';
import { NetworkModel, NetworkTableType, IpDetailsTableType, NetworkType } from './model';
import { setNetworkQueriesActivePageToZero } from './helpers';

export const mockNetworkState: NetworkModel = {
  page: {
    queries: {
      [NetworkTableType.topNFlowSource]: {
        activePage: 7,
        limit: DEFAULT_TABLE_LIMIT,
        topNFlowSort: {
          field: NetworkTopNFlowFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.topNFlowDestination]: {
        activePage: 3,
        limit: DEFAULT_TABLE_LIMIT,
        topNFlowSort: {
          field: NetworkTopNFlowFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.dns]: {
        activePage: 5,
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
      [IpDetailsTableType.domains]: {
        activePage: 8,
        flowDirection: FlowDirection.uniDirectional,
        limit: DEFAULT_TABLE_LIMIT,
        domainsSortField: {
          field: DomainsFields.bytes,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.tls]: {
        activePage: 2,
        limit: DEFAULT_TABLE_LIMIT,
        tlsSortField: {
          field: TlsFields._id,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.users]: {
        activePage: 6,
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

describe('Network redux store', () => {
  describe('#setNetworkQueriesActivePageToZero', () => {
    test('set activePage to zero for all queries in hosts page  ', () => {
      expect(setNetworkQueriesActivePageToZero(mockNetworkState, NetworkType.page)).toEqual({
        topNFlowSource: {
          activePage: 0,
          limit: 10,
          topNFlowSort: { field: 'bytes_out', direction: 'desc' },
        },
        topNFlowDestination: {
          activePage: 0,
          limit: 10,
          topNFlowSort: { field: 'bytes_out', direction: 'desc' },
        },
        dns: {
          activePage: 0,
          limit: 10,
          dnsSortField: { field: 'uniqueDomains', direction: 'desc' },
          isPtrIncluded: false,
        },
      });
    });

    test('set activePage to zero for all queries in host details  ', () => {
      expect(setNetworkQueriesActivePageToZero(mockNetworkState, NetworkType.details)).toEqual({
        domains: {
          activePage: 0,
          flowDirection: 'uniDirectional',
          limit: 10,
          domainsSortField: { field: 'bytes', direction: 'desc' },
        },
        tls: { activePage: 0, limit: 10, tlsSortField: { field: '_id', direction: 'desc' } },
        users: { activePage: 0, limit: 10, usersSortField: { field: 'name', direction: 'asc' } },
      });
    });
  });
});
