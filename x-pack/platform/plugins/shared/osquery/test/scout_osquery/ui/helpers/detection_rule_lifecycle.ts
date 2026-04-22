/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { OSQUERY_API_VERSION } from '../../common/constants';

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const detectionEngineBasePath = (spaceId?: string) =>
  spaceId && spaceId !== 'default' ? `/s/${spaceId}/api/detection_engine` : '/api/detection_engine';

const INVESTIGATION_GUIDE_NOTE =
  `!{osquery{"query":"SELECT * FROM os_version where name='{{host.os.name}}';","label":"Get processes","ecs_mapping":{"host.os.platform":{"field":"platform"}}}}\n\n` +
  `!{osquery{"query":"select * from users;","label":"Get users"}}`;

const HOST_FILTER = {
  meta: {
    type: 'custom',
    disabled: false,
    negate: false,
    alias: null,
    key: 'query',
    value: '{"bool":{"must_not":{"wildcard":{"host.name":"dev-fleet-server.*"}}}}',
  },
  query: {
    bool: {
      must_not: {
        wildcard: {
          'host.name': 'dev-fleet-server.*',
        },
      },
    },
  },
  $state: {
    store: 'appState',
  },
};

export const buildOsqueryAlertTestRule = (options: {
  includeResponseActions?: boolean;
  nameSuffix?: string;
}) => {
  const name = `Test rule ${options.nameSuffix ?? unique()}`;

  return {
    type: 'query',
    index: [
      'apm-*-transaction*',
      'auditbeat-*',
      'endgame-*',
      'filebeat-*',
      'logs-*',
      'packetbeat-*',
      'traces-apm*',
      'winlogbeat-*',
      '-*elastic-cloud-logs-*',
    ],
    filters: [HOST_FILTER],
    language: 'kuery',
    query: '_id:*',
    author: [],
    false_positives: [],
    references: [],
    risk_score: 21,
    risk_score_mapping: [],
    severity: 'low',
    severity_mapping: [],
    threat: [],
    name,
    description: 'Test rule',
    tags: [],
    license: '',
    interval: '1m',
    from: 'now-360s',
    to: 'now',
    meta: { from: '1m', kibana_siem_app_url: 'http://localhost:5620/app/security' },
    actions: [],
    enabled: true,
    throttle: 'no_actions',
    note: INVESTIGATION_GUIDE_NOTE,
    ...(options.includeResponseActions
      ? {
          response_actions: [
            {
              params: {
                query: "SELECT * FROM os_version where name='{{host.os.name}}';",
                ecs_mapping: {
                  'host.os.platform': {
                    field: 'platform',
                  },
                },
              },
              action_type_id: '.osquery',
            },
            {
              params: {
                query: 'select * from users;',
              },
              action_type_id: '.osquery',
            },
          ],
        }
      : {}),
  };
};

export const createDetectionRule = async (
  kbnClient: KbnClient,
  body: Record<string, unknown>,
  spaceId?: string
): Promise<{ id: string; name: string }> => {
  const { data } = await kbnClient.request<{ id: string; name: string }>({
    method: 'POST',
    path: `${detectionEngineBasePath(spaceId)}/rules`,
    headers: { 'elastic-api-version': OSQUERY_API_VERSION },
    body,
  });

  return data;
};

export const deleteDetectionRule = async (
  kbnClient: KbnClient,
  ruleId: string,
  spaceId?: string
): Promise<void> => {
  await kbnClient.request({
    method: 'DELETE',
    path: `${detectionEngineBasePath(spaceId)}/rules?id=${ruleId}`,
    headers: { 'elastic-api-version': OSQUERY_API_VERSION },
    ignoreErrors: [404],
  });
};
