/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSecurityIndexPatterns } from './security_index_pattern_utils';

jest.mock('../../../../../kibana_services', () => {
  return {
    getUiSettings() {
      return {
        get() {
          return ['logs-*', 'traces-apm*', 'endgame-*'];
        },
      };
    },
    getIndexPatternService() {
      return {
        getCache() {
          return [
            {
              id: 'kibana-event-log-data-view',
              type: 'index-pattern',
              managed: true,
              updatedAt: '2024-03-22T15:56:28.816Z',
              createdAt: '2024-03-22T15:56:28.816Z',
              attributes: {
                title: '.kibana-event-log-*',
                name: '.kibana-event-log-*',
              },
              references: [],
              namespaces: ['default'],
              version: 'WzExNCwxXQ==',
            },
            {
              id: 'apm_static_data_view_id_default',
              type: 'index-pattern',
              managed: false,
              updatedAt: '2024-03-21T16:50:57.705Z',
              createdAt: '2024-03-21T16:50:57.705Z',
              attributes: {
                title: 'traces-apm*,apm-*,apm-*,metrics-apm*,apm-*',
                name: 'APM',
              },
              references: [],
              namespaces: ['default'],
              version: 'WzUsMV0=',
            },
            {
              id: 'security-solution-default',
              type: 'index-pattern',
              managed: false,
              updatedAt: '2024-03-22T15:52:37.132Z',
              createdAt: '2024-03-22T15:52:37.132Z',
              attributes: {
                title:
                  '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,packetbeat-*,winlogbeat-*,-*elastic-cloud-logs-*',
                name: '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,packetbeat-*,winlogbeat-*,-*elastic-cloud-logs-*',
              },
              references: [],
              namespaces: ['default'],
              version: 'WzEwMCwxXQ==',
            },
            {
              id: 'metrics-*',
              type: 'index-pattern',
              managed: true,
              updatedAt: '2024-03-22T15:52:44.340Z',
              createdAt: '2024-03-22T15:52:43.544Z',
              attributes: {
                title: 'metrics-*',
              },
              references: [],
              namespaces: ['*', 'default'],
              version: 'WzEwNiwxXQ==',
            },
            {
              id: 'logs-*',
              type: 'index-pattern',
              managed: true,
              updatedAt: '2024-03-22T15:52:43.600Z',
              createdAt: '2024-03-22T15:52:43.544Z',
              attributes: {
                title: 'logs-*',
              },
              references: [],
              namespaces: ['*', 'default'],
              version: 'WzEwNSwxXQ==',
            },
          ];
        },
      };
    },
  };
});

describe('getSecurityIndexPatterns', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });
  it('returns logs, apm and security index patterns only', async () => {
    const resp = await getSecurityIndexPatterns();
    expect(resp).toEqual([
      {
        id: 'apm_static_data_view_id_default',
        title: 'traces-apm*,apm-*,apm-*,metrics-apm*,apm-*',
      },
      {
        id: 'security-solution-default',
        title:
          '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,packetbeat-*,winlogbeat-*,-*elastic-cloud-logs-*',
      },
      { id: 'logs-*', title: 'logs-*' },
    ]);
  });
});
