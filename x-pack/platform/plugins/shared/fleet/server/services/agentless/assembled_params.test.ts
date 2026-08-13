/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import type { FullAgentPolicy, PackagePolicy } from '../../types';

import { buildAssembledParamsConfig } from './assembled_params';
import { toSecretEnvVarName } from './standalone_config';

describe('buildAssembledParamsConfig', () => {
  const secretId = 'abc-123';

  const packagePolicy = {
    id: 'pp-1',
    name: 'agentless_hello_world-1',
    namespace: 'default',
    revision: 1,
    package: { name: 'agentless_hello_world', title: 'Hello World', version: '0.6.0' },
    inputs: [
      {
        type: 'cel',
        policy_template: 'agentless_hello_world',
        enabled: true,
        vars: {
          api_token: { type: 'password', value: { isSecretRef: true, id: secretId } },
        },
        streams: [
          {
            id: 'cel-agentless_hello_world.generic-pp-1',
            enabled: true,
            data_stream: { dataset: 'agentless_hello_world.generic', type: 'logs' },
            vars: { url: { type: 'text', value: 'https://epr.elastic.co' } },
          },
          {
            id: 'cel-agentless_hello_world.mock_counter-pp-1',
            enabled: false,
            data_stream: { dataset: 'agentless_hello_world.mock_counter', type: 'metrics' },
          },
        ],
      },
      { type: 'httpjson', enabled: false, streams: [] },
    ],
  } as unknown as PackagePolicy;

  const standaloneAgentPolicy = {
    id: 'policy-1',
    outputs: {
      default: { type: 'elasticsearch', hosts: ['https://es.example:443'], api_key: '${API_KEY}' },
    },
    output_permissions: {
      default: { _elastic_agent_checks: { cluster: ['monitor'] } },
    },
    inputs: [
      {
        id: 'cel-agentless_hello_world-pp-1',
        type: 'cel',
        processors: [
          { add_fields: { target: '', fields: { organization: 'obs', division: 'eng' } } },
        ],
      },
    ],
  } as unknown as FullAgentPolicy;

  const createEsClient = () => {
    const esClient = elasticsearchServiceMock.createInternalClient();
    esClient.security.createApiKey.mockResolvedValue({
      id: 'key-id',
      api_key: 'key-secret',
    } as any);
    return esClient;
  };

  it('builds params from the stored package policy, keeping secrets out of the body', async () => {
    const esClient = createEsClient();

    const { integrationParams, integrationSecrets } = await buildAssembledParamsConfig({
      esClient,
      policyId: 'policy-1',
      packagePolicy,
      standaloneAgentPolicy,
      secretValuesById: { [secretId]: 'super-secret-value' },
    });

    expect(integrationParams).toEqual({
      package: { name: 'agentless_hello_world', version: '0.6.0' },
      package_policy_id: 'pp-1',
      name: 'agentless_hello_world-1',
      namespace: 'default',
      revision: 1,
      inputs: [
        {
          type: 'cel',
          policy_template: 'agentless_hello_world',
          enabled: true,
          vars: { api_token: { type: 'password', value: '${SECRET_abc_123}' } },
          streams: [
            {
              id: 'cel-agentless_hello_world.generic-pp-1',
              enabled: true,
              data_stream: { dataset: 'agentless_hello_world.generic', type: 'logs' },
              vars: { url: { type: 'text', value: 'https://epr.elastic.co' } },
            },
          ],
        },
      ],
      output: { hosts: ['https://es.example:443'], ssl_verification_mode: 'none' },
      global_data_tags: [
        { name: 'organization', value: 'obs' },
        { name: 'division', value: 'eng' },
      ],
    });

    expect(integrationSecrets).toEqual({
      [toSecretEnvVarName(secretId)]: 'super-secret-value',
      API_KEY: 'key-id:key-secret',
    });

    // No plaintext secret anywhere in the params body.
    expect(JSON.stringify(integrationParams)).not.toContain('super-secret-value');
  });

  it('throws when a referenced secret has no submitted value', async () => {
    const esClient = createEsClient();

    await expect(
      buildAssembledParamsConfig({
        esClient,
        policyId: 'policy-1',
        packagePolicy,
        standaloneAgentPolicy,
        secretValuesById: {},
      })
    ).rejects.toThrow(/No value available for secret \[abc-123\]/);
  });

  it('throws when the output has no hosts', async () => {
    const esClient = createEsClient();

    await expect(
      buildAssembledParamsConfig({
        esClient,
        policyId: 'policy-1',
        packagePolicy,
        standaloneAgentPolicy: {
          ...standaloneAgentPolicy,
          outputs: { default: { type: 'elasticsearch' } },
        } as unknown as FullAgentPolicy,
        secretValuesById: { [secretId]: 'super-secret-value' },
      })
    ).rejects.toThrow(/has no hosts/);
  });
});
