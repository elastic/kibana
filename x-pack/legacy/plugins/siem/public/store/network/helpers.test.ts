/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  NetworkTopNFlowFields,
  NetworkDnsFields,
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
      [NetworkTableType.tls]: {
        activePage: 2,
        limit: DEFAULT_TABLE_LIMIT,
        tlsSortField: {
          field: TlsFields._id,
          direction: Direction.desc,
        },
      },
    },
  },
  details: {
    queries: {
      [IpDetailsTableType.topNFlowSource]: {
        activePage: 7,
        limit: DEFAULT_TABLE_LIMIT,
        topNFlowSort: {
          field: NetworkTopNFlowFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.topNFlowDestination]: {
        activePage: 3,
        limit: DEFAULT_TABLE_LIMIT,
        topNFlowSort: {
          field: NetworkTopNFlowFields.bytes_out,
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
    flowTarget: FlowTarget.source,
  },
};

describe('Network redux store', () => {
  describe('#setNetworkQueriesActivePageToZero', () => {
    test('set activePage to zero for all queries in hosts page  ', () => {
      expect(setNetworkQueriesActivePageToZero(mockNetworkState, NetworkType.page)).toEqual({
        [NetworkTableType.topNFlowSource]: {
          activePage: 0,
          limit: 10,
          topNFlowSort: { field: 'bytes_out', direction: 'desc' },
        },
        [NetworkTableType.topNFlowDestination]: {
          activePage: 0,
          limit: 10,
          topNFlowSort: { field: 'bytes_out', direction: 'desc' },
        },
        [NetworkTableType.dns]: {
          activePage: 0,
          limit: 10,
          dnsSortField: { field: 'uniqueDomains', direction: 'desc' },
          isPtrIncluded: false,
        },
        [NetworkTableType.tls]: {
          activePage: 0,
          limit: 10,
          tlsSortField: {
            direction: 'desc',
            field: '_id',
          },
        },
      });
    });

    test('set activePage to zero for all queries in host details  ', () => {
      expect(setNetworkQueriesActivePageToZero(mockNetworkState, NetworkType.details)).toEqual({
        [IpDetailsTableType.topNFlowSource]: {
          activePage: 0,
          limit: 10,
          topNFlowSort: { field: 'bytes_out', direction: 'desc' },
        },
        [IpDetailsTableType.topNFlowDestination]: {
          activePage: 0,
          limit: 10,
          topNFlowSort: { field: 'bytes_out', direction: 'desc' },
        },
        [IpDetailsTableType.tls]: {
          activePage: 0,
          limit: 10,
          tlsSortField: { field: '_id', direction: 'desc' },
        },
        [IpDetailsTableType.users]: {
          activePage: 0,
          limit: 10,
          usersSortField: { field: 'name', direction: 'asc' },
        },
      });
    });
  });
});
