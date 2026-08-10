/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import type {
  FullAgentPolicy,
  NewPackagePolicy,
  PackageInfo,
  PackagePolicy,
} from '../../../common/types';

import {
  OUTPUT_API_KEY_ENV_VAR,
  buildStandaloneAgentlessConfig,
  collectSecretValuesById,
  toSecretEnvVarName,
} from './standalone_config';

const mockPackageInfo = {
  name: 'mock-package',
  title: 'Mock package',
  version: '0.0.0',
  description: 'description',
  type: 'integration',
  status: 'not_installed',
  vars: [
    { name: 'api-secret', type: 'text', secret: true },
    { name: 'multi-secret', type: 'text', multi: true, secret: true },
    { name: 'plain-var', type: 'text' },
  ],
  data_streams: [],
  policy_templates: [],
} as unknown as PackageInfo;

const createEsClientMock = (apiKey = { id: 'key-id', api_key: 'key-secret' }) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.security.createApiKey.mockResolvedValue(apiKey as any);
  return esClient;
};

const standalonePolicyWith = (overrides: Partial<FullAgentPolicy> = {}): FullAgentPolicy =>
  ({
    id: 'policy-1',
    outputs: {
      default: {
        type: 'elasticsearch',
        hosts: ['http://localhost:9200'],
        api_key: '${API_KEY}',
      },
    },
    // Mirrors what storedPackagePoliciesToAgentPermissions() produces for a simple integration.
    output_permissions: {
      default: {
        _elastic_agent_checks: { cluster: ['monitor'] },
        'mock-package-default': {
          indices: [{ names: ['logs-mock.*-default'], privileges: ['auto_configure', 'create_doc'] }],
        },
      },
    },
    inputs: [],
    revision: 1,
    ...overrides,
  } as unknown as FullAgentPolicy);

describe('toSecretEnvVarName', () => {
  it('replaces characters that are invalid in an env var name', () => {
    expect(toSecretEnvVarName('qX7-vMkBqZR9Ky1L4rMz')).toEqual('SECRET_qX7_vMkBqZR9Ky1L4rMz');
  });

  it('leaves already-valid ids untouched beyond the prefix', () => {
    expect(toSecretEnvVarName('abc123')).toEqual('SECRET_abc123');
  });
});

describe('collectSecretValuesById', () => {
  it('pairs each secret id with the submitted plaintext', () => {
    const plaintextPackagePolicy = {
      vars: { 'api-secret': { value: 'submitted-value' } },
      inputs: [],
    } as unknown as NewPackagePolicy;

    const storedPackagePolicy = {
      vars: { 'api-secret': { value: { isSecretRef: true, id: 'secret-id-1' } } },
      inputs: [],
    } as unknown as PackagePolicy;

    expect(
      collectSecretValuesById({
        plaintextPackagePolicy,
        storedPackagePolicy,
        packageInfo: mockPackageInfo,
      })
    ).toEqual({ 'secret-id-1': 'submitted-value' });
  });

  it('pairs multi-value secrets id-by-id in submission order', () => {
    const plaintextPackagePolicy = {
      vars: { 'multi-secret': { value: ['one', 'two'] } },
      inputs: [],
    } as unknown as NewPackagePolicy;

    const storedPackagePolicy = {
      vars: { 'multi-secret': { value: { isSecretRef: true, ids: ['id-a', 'id-b'] } } },
      inputs: [],
    } as unknown as PackagePolicy;

    expect(
      collectSecretValuesById({
        plaintextPackagePolicy,
        storedPackagePolicy,
        packageInfo: mockPackageInfo,
      })
    ).toEqual({ 'id-a': 'one', 'id-b': 'two' });
  });

  it('skips secrets the user did not resubmit, so agentless-api keeps the stored value', () => {
    const plaintextPackagePolicy = {
      vars: { 'api-secret': { value: { isSecretRef: true, id: 'secret-id-1' } } },
      inputs: [],
    } as unknown as NewPackagePolicy;

    const storedPackagePolicy = {
      vars: { 'api-secret': { value: { isSecretRef: true, id: 'secret-id-1' } } },
      inputs: [],
    } as unknown as PackagePolicy;

    expect(
      collectSecretValuesById({
        plaintextPackagePolicy,
        storedPackagePolicy,
        packageInfo: mockPackageInfo,
      })
    ).toEqual({});
  });
});

describe('buildStandaloneAgentlessConfig', () => {
  it('rewrites secret references to env var placeholders and supplies their values', async () => {
    const { config, integrationSecrets } = await buildStandaloneAgentlessConfig({
      esClient: createEsClientMock(),
      policyId: 'policy-1',
      standaloneAgentPolicy: standalonePolicyWith({
        inputs: [
          {
            id: 'input-1',
            password: '$co.elastic.secret{qX7-vMkBqZR9Ky1L4rMz}',
          },
        ] as unknown as FullAgentPolicy['inputs'],
        secret_references: [{ id: 'qX7-vMkBqZR9Ky1L4rMz' }],
      }),
      secretValuesById: { 'qX7-vMkBqZR9Ky1L4rMz': 'submitted-password' },
    });

    expect((config.inputs[0] as any).password).toEqual('${SECRET_qX7_vMkBqZR9Ky1L4rMz}');
    expect(integrationSecrets.SECRET_qX7_vMkBqZR9Ky1L4rMz).toEqual('submitted-password');
  });

  it('rewrites references embedded inside a larger string', async () => {
    const { config } = await buildStandaloneAgentlessConfig({
      esClient: createEsClientMock(),
      policyId: 'policy-1',
      standaloneAgentPolicy: standalonePolicyWith({
        inputs: [
          {
            id: 'input-1',
            header: 'Authorization Basic: $co.elastic.secret{abc123}',
          },
        ] as unknown as FullAgentPolicy['inputs'],
      }),
      secretValuesById: { abc123: 'submitted-token' },
    });

    expect((config.inputs[0] as any).header).toEqual('Authorization Basic: ${SECRET_abc123}');
  });

  it('mints the output API key scoped to output_permissions and leaves ${API_KEY} in the config', async () => {
    const esClient = createEsClientMock({ id: 'minted-id', api_key: 'minted-secret' });

    const { config, integrationSecrets } = await buildStandaloneAgentlessConfig({
      esClient,
      policyId: 'policy-1',
      standaloneAgentPolicy: standalonePolicyWith(),
      secretValuesById: {},
    });

    expect(config.outputs.default.api_key).toEqual('${API_KEY}');
    // Colon-joined, not the base64 `encoded` form — this is what the agent expects.
    expect(integrationSecrets[OUTPUT_API_KEY_ENV_VAR]).toEqual('minted-id:minted-secret');
    expect(esClient.security.createApiKey).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'agentless-policy-1',
        role_descriptors: {
          _elastic_agent_checks: { cluster: ['monitor'] },
          'mock-package-default': {
            indices: [
              { names: ['logs-mock.*-default'], privileges: ['auto_configure', 'create_doc'] },
            ],
          },
        },
      }),
      {}
    );
  });

  it('mints the output API key as the configured service token principal, not as Kibana', async () => {
    const esClient = createEsClientMock({ id: 'minted-id', api_key: 'minted-secret' });

    await buildStandaloneAgentlessConfig({
      esClient,
      policyId: 'policy-1',
      standaloneAgentPolicy: standalonePolicyWith(),
      secretValuesById: {},
      outputApiKeyServiceToken: 'fleet-server-service-token',
    });

    expect(esClient.security.createApiKey).toHaveBeenCalledWith(expect.anything(), {
      headers: { authorization: 'Bearer fleet-server-service-token' },
    });
  });

  it('strips output_permissions from the config before delivery (fleet-server metadata)', async () => {
    const { config } = await buildStandaloneAgentlessConfig({
      esClient: createEsClientMock(),
      policyId: 'policy-1',
      standaloneAgentPolicy: standalonePolicyWith(),
      secretValuesById: {},
    });

    expect(config.output_permissions).toBeUndefined();
  });

  it('fails when output_permissions is missing for the output', async () => {
    await expect(
      buildStandaloneAgentlessConfig({
        esClient: createEsClientMock(),
        policyId: 'policy-1',
        standaloneAgentPolicy: standalonePolicyWith({ output_permissions: undefined }),
        secretValuesById: {},
      })
    ).rejects.toThrow('No output_permissions found for output [default]');
  });

  it('drops secret_references, which only fleet-server consumes', async () => {
    const { config } = await buildStandaloneAgentlessConfig({
      esClient: createEsClientMock(),
      policyId: 'policy-1',
      standaloneAgentPolicy: standalonePolicyWith({
        secret_references: [{ id: 'abc123' }],
        inputs: [
          { id: 'input-1', password: '$co.elastic.secret{abc123}' },
        ] as unknown as FullAgentPolicy['inputs'],
      }),
      secretValuesById: { abc123: 'submitted-password' },
    });

    expect(config.secret_references).toBeUndefined();
  });

  it('never leaves a plaintext credential in the config body', async () => {
    const { config, integrationSecrets } = await buildStandaloneAgentlessConfig({
      esClient: createEsClientMock(),
      policyId: 'policy-1',
      standaloneAgentPolicy: standalonePolicyWith({
        inputs: [
          { id: 'input-1', password: '$co.elastic.secret{abc123}' },
        ] as unknown as FullAgentPolicy['inputs'],
      }),
      secretValuesById: { abc123: 'super-secret-value' },
    });

    const serialized = JSON.stringify(config);
    for (const value of Object.values(integrationSecrets)) {
      expect(serialized).not.toContain(value);
    }
  });

  it('fails when a referenced secret has no value to ship', async () => {
    await expect(
      buildStandaloneAgentlessConfig({
        esClient: createEsClientMock(),
        policyId: 'policy-1',
        standaloneAgentPolicy: standalonePolicyWith({
          inputs: [
            { id: 'input-1', password: '$co.elastic.secret{missing-id}' },
          ] as unknown as FullAgentPolicy['inputs'],
        }),
        secretValuesById: {},
      })
    ).rejects.toThrow('No value available for secret [missing-id]');
  });

  it('fails loudly when two secret ids collapse onto the same env var name', async () => {
    await expect(
      buildStandaloneAgentlessConfig({
        esClient: createEsClientMock(),
        policyId: 'policy-1',
        standaloneAgentPolicy: standalonePolicyWith({
          inputs: [
            {
              id: 'input-1',
              first: '$co.elastic.secret{ab-cd}',
              second: '$co.elastic.secret{ab_cd}',
            },
          ] as unknown as FullAgentPolicy['inputs'],
        }),
        secretValuesById: { 'ab-cd': 'one', ab_cd: 'two' },
      })
    ).rejects.toThrow('both map to env var [SECRET_ab_cd]');
  });

  it('fails when the config has a placeholder with no supplied value', async () => {
    await expect(
      buildStandaloneAgentlessConfig({
        esClient: createEsClientMock(),
        policyId: 'policy-1',
        standaloneAgentPolicy: standalonePolicyWith({
          inputs: [
            { id: 'input-1', token: '${SOME_UNSUPPLIED_VAR}' },
          ] as unknown as FullAgentPolicy['inputs'],
        }),
        secretValuesById: {},
      })
    ).rejects.toThrow('placeholders with no value supplied: SOME_UNSUPPLIED_VAR');
  });
});
