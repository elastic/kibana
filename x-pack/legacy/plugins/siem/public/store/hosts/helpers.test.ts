/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, HostsFields } from '../../graphql/types';
import { DEFAULT_TABLE_LIMIT } from '../constants';
import { HostsModel, HostsTableType, HostsType } from './model';
import { setHostsQueriesActivePageToZero } from './helpers';

export const mockHostsState: HostsModel = {
  page: {
    queries: {
      [HostsTableType.authentications]: {
        activePage: 5,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.hosts]: {
        activePage: 9,
        direction: Direction.desc,
        limit: DEFAULT_TABLE_LIMIT,
        sortField: HostsFields.lastSeen,
      },
      [HostsTableType.events]: {
        activePage: 4,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.uncommonProcesses]: {
        activePage: 8,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.anomalies]: null,
      [HostsTableType.alerts]: {
        activePage: 4,
        limit: DEFAULT_TABLE_LIMIT,
      },
    },
  },
  details: {
    queries: {
      [HostsTableType.authentications]: {
        activePage: 5,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.hosts]: {
        activePage: 9,
        direction: Direction.desc,
        limit: DEFAULT_TABLE_LIMIT,
        sortField: HostsFields.lastSeen,
      },
      [HostsTableType.events]: {
        activePage: 4,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.uncommonProcesses]: {
        activePage: 8,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.anomalies]: null,
      [HostsTableType.alerts]: {
        activePage: 4,
        limit: DEFAULT_TABLE_LIMIT,
      },
    },
  },
};

describe('Hosts redux store', () => {
  describe('#setHostsQueriesActivePageToZero', () => {
    test('set activePage to zero for all queries in hosts page  ', () => {
      expect(setHostsQueriesActivePageToZero(mockHostsState, HostsType.page)).toEqual({
        allHosts: {
          activePage: 0,
          direction: 'desc',
          limit: 10,
          sortField: 'lastSeen',
        },
        anomalies: null,
        authentications: {
          activePage: 0,
          limit: 10,
        },
        events: {
          activePage: 0,
          limit: 10,
        },
        uncommonProcesses: {
          activePage: 0,
          limit: 10,
        },
        alerts: {
          activePage: 0,
          limit: 10,
        },
      });
    });

    test('set activePage to zero for all queries in host details  ', () => {
      expect(setHostsQueriesActivePageToZero(mockHostsState, HostsType.details)).toEqual({
        allHosts: {
          activePage: 0,
          direction: 'desc',
          limit: 10,
          sortField: 'lastSeen',
        },
        anomalies: null,
        authentications: {
          activePage: 0,
          limit: 10,
        },
        events: {
          activePage: 0,
          limit: 10,
        },
        uncommonProcesses: {
          activePage: 0,
          limit: 10,
        },
        alerts: {
          activePage: 0,
          limit: 10,
        },
      });
    });
  });
});
