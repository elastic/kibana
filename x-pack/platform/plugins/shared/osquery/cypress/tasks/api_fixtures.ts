/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import type {
  AgentPolicy,
  CreatePackagePolicyResponse,
  PackagePolicy,
} from '@kbn/fleet-plugin/common';
import type { Case } from '@kbn/cases-plugin/common';
import { API_VERSIONS } from '../../common/constants';
import type { SavedQuerySOFormData } from '../../public/saved_queries/form/use_saved_query_form';
import type { LiveQueryDetailsItem } from '../../public/actions/use_live_query_details';
import type { PackSavedObject, PackItem } from '../../public/packs/types';
import type { SavedQuerySO } from '../../public/routes/saved_queries/list';
import { generateRandomStringName } from './integrations';
import { request } from './common';
import { ServerlessRoleName } from '../support/roles';

export const savedQueryFixture = {
  id: generateRandomStringName(1)[0],
  description: 'Test saved query description',
  ecs_mapping: { labels: { field: 'hours' } },
  interval: '3600',
  query: 'select * from uptime;',
  platform: 'linux,darwin',
};

export const packFixture = () => ({
  description: generateRandomStringName(1)[0],
  enabled: true,
  name: generateRandomStringName(1)[0],
  queries: {
    [generateRandomStringName(1)[0]]: {
      ecs_mapping: {},
      interval: 3600,
      query: 'select * from uptime;',
    },
  },
});

export const multiQueryPackFixture = () => ({
  description: generateRandomStringName(1)[0],
  enabled: true,
  name: generateRandomStringName(1)[0],
  queries: {
    [generateRandomStringName(1)[0]]: {
      ecs_mapping: {},
      interval: 3600,
      platform: 'linux',
      query: 'SELECT * FROM memory_info;',
    },
    [generateRandomStringName(1)[0]]: {
      ecs_mapping: {},
      interval: 3600,
      platform: 'linux,windows,darwin',
      query: 'SELECT * FROM system_info;',
    },
    [generateRandomStringName(1)[0]]: {
      ecs_mapping: {},
      interval: 10,
      query: 'select opera_extensions.* from users join opera_extensions using (uid);',
    },
  },
});

export const loadSavedQuery = (payload: SavedQuerySOFormData = savedQueryFixture) =>
  request<{ data: SavedQuerySO }>({
    method: 'POST',
    body: {
      ...payload,
      id: payload.id ?? generateRandomStringName(1)[0],
    },
    headers: {
      'Elastic-Api-Version': API_VERSIONS.public.v1,
    },
    url: '/api/osquery/saved_queries',
  }).then((response) => response.body.data);

export const cleanupSavedQuery = (id: string) => {
  request({
    method: 'DELETE',
    url: `/api/osquery/saved_queries/${id}`,
    headers: {
      'Elastic-Api-Version': API_VERSIONS.public.v1,
    },
    failOnStatusCode: false,
  });
};

export const loadPack = (payload: Partial<PackItem> = {}, space = 'default') =>
  request<{ data: PackSavedObject }>({
    method: 'POST',
    body: {
      ...payload,
      name: payload.name ?? generateRandomStringName(1)[0],
      shards: {},
      queries: payload.queries ?? {},
      enabled: payload.enabled || true,
    },
    headers: {
      'Elastic-Api-Version': API_VERSIONS.public.v1,
    },

    url: `/s/${space}/api/osquery/packs`,
  }).then((response) => response.body.data);

export const createPack = (payload: Partial<PackItem> = {}) =>
  request<{ data: PackSavedObject; message?: string }>({
    method: 'POST',
    failOnStatusCode: false,
    body: {
      ...payload,
      name: generateRandomStringName(1)[0],
      shards: {},
      queries: {
        test: {
          ecs_mapping: {},
          interval: 3600,
          query: 'select * from uptime;',
        },
      },
      enabled: true,
    },
    headers: {
      'Elastic-Api-Version': API_VERSIONS.public.v1,
    },

    url: `/s/default/api/osquery/packs`,
  });

export const getPack = (packId: string) =>
  request<{ data: PackItem }>({
    method: 'GET',
    url: `/api/osquery/packs/${packId}`,
    headers: {
      'Elastic-Api-Version': API_VERSIONS.public.v1,
    },
  });

export const cleanupPack = (id: string, space = 'default') => {
  request({
    method: 'DELETE',
    url: `/s/${space}/api/osquery/packs/${id}`,
    headers: {
      'Elastic-Api-Version': API_VERSIONS.public.v1,
    },
    failOnStatusCode: false,
  });
};

export const loadLiveQuery = (
  payload = {
    agent_all: true,
    query: 'select * from uptime;',
    kuery: '',
  }
) =>
  request<{
    data: LiveQueryDetailsItem & { queries: NonNullable<LiveQueryDetailsItem['queries']> };
  }>({
    method: 'POST',
    body: payload,
    url: `/api/osquery/live_queries`,
    headers: {
      'Elastic-Api-Version': API_VERSIONS.public.v1,
    },
  }).then((response) => response.body.data);

export const loadRule = (includeResponseActions = false) => {
  cy.login(ServerlessRoleName.SOC_MANAGER, false);

  return request<RuleResponse>({
    method: 'POST',
    body: {
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
      filters: [
        {
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
        },
      ],
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
      name: `Test rule ${generateRandomStringName(1)[0]}`,
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
      note: '!{osquery{"query":"SELECT * FROM os_version where name=\'{{host.os.name}}\';","label":"Get processes","ecs_mapping":{"host.os.platform":{"field":"platform"}}}}\n\n!{osquery{"query":"select * from users;","label":"Get users"}}',
      ...(includeResponseActions
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
    } as RuleCreateProps,
    url: `/api/detection_engine/rules`,
    headers: {
      'Elastic-Api-Version': API_VERSIONS.public.v1,
    },
  }).then((response) => response.body);
};

export const cleanupRule = (id: string) => {
  request({
    method: 'DELETE',
    url: `/api/detection_engine/rules?id=${id}`,
    headers: {
      'Elastic-Api-Version': API_VERSIONS.public.v1,
    },
    failOnStatusCode: false,
  });
};

export const loadCase = (owner: string) =>
  request<Case>({
    method: 'POST',
    url: '/api/cases',
    body: {
      title: `Test ${owner} case ${generateRandomStringName(1)[0]}`,
      tags: [],
      severity: 'low',
      description: 'Test security case',
      assignees: [],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: true },
      owner,
    },
  }).then((response) => response.body);

export const cleanupCase = (id: string) => {
  request({
    method: 'DELETE',
    url: '/api/cases',
    qs: { ids: JSON.stringify([id]) },
    failOnStatusCode: false,
  });
};

export const loadSpace = () => {
  const spaceId = generateRandomStringName(1)[0];

  return request<{ id: string }>({
    method: 'POST',
    url: '/api/spaces/space',
    body: {
      id: spaceId,
      name: spaceId,
    },
    failOnStatusCode: false,
  }).then((response) => response.body);
};

export const cleanupSpace = (id: string) =>
  request({
    method: 'DELETE',
    url: `/api/spaces/space/${id}`,
  });

export const loadAgentPolicy = () =>
  request<{ item: AgentPolicy }>({
    method: 'POST',
    body: {
      name: generateRandomStringName(1)[0],
      description: '',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
      inactivity_timeout: 1209600,
    },
    headers: {
      'Elastic-Api-Version': API_VERSIONS.public.v1,
    },
    url: '/api/fleet/agent_policies',
  }).then((response) => response.body.item);

export const getInstalledOsqueryIntegrationVersion = () =>
  request<{ item: PackagePolicy }>({
    method: 'GET',
    url: `/api/fleet/epm/packages/osquery_manager`,
    headers: {
      'x-elastic-internal-product': 'security-solution',
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  }).then((response) => response.body.item);

export const addOsqueryToAgentPolicy = (
  agentPolicyId: string,
  agentPolicyName: string,
  integrationVersion?: string
) =>
  request<CreatePackagePolicyResponse>({
    method: 'POST',
    url: '/api/fleet/package_policies',
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
    body: {
      policy_id: agentPolicyId,
      package: {
        name: 'osquery_manager',
        version: integrationVersion,
      },
      name: `Policy for ${agentPolicyName}`,
      description: '',
      namespace: 'default',
      inputs: {
        'osquery_manager-osquery': {
          enabled: true,
          streams: {},
        },
      },
    },
  });

export const cleanupAgentPolicy = (agentPolicyId: string) =>
  request({
    method: 'POST',
    body: { agentPolicyId },
    headers: {
      'Elastic-Api-Version': API_VERSIONS.public.v1,
    },
    url: '/api/fleet/agent_policies/delete',
  });
