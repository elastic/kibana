/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { dump } from 'js-yaml';

import { schema } from '@kbn/config-schema';

import type { FleetRequestHandlerContext } from '../..';

import { xpackMocks } from '../../mocks';
import type { AgentPolicy, FullAgentPolicy } from '../../types';
import {
  AgentPolicyResponseSchema,
  BulkGetAgentPoliciesResponseSchema,
  GetAgentPolicyResponseSchema,
  DeleteAgentPolicyResponseSchema,
  GetFullAgentPolicyResponseSchema,
  DownloadFullAgentPolicyResponseSchema,
  GetK8sManifestResponseScheme,
} from '../../types';

import { ListResponseSchema } from '../schema/utils';
import { agentPolicyService } from '../../services';
import { fullAgentPolicyToYaml } from '../../../common/services';

import {
  getAgentPoliciesHandler,
  getOneAgentPolicyHandler,
  createAgentPolicyHandler,
  updateAgentPolicyHandler,
  copyAgentPolicyHandler,
  deleteAgentPoliciesHandler,
  getFullAgentPolicy,
  downloadFullAgentPolicy,
  downloadK8sManifest,
  getK8sManifest,
  bulkGetAgentPoliciesHandler,
} from './handlers';

jest.mock('./handlers', () => ({
  ...jest.requireActual('./handlers'),
  getAgentPoliciesHandler: jest.fn(),
  getOneAgentPolicyHandler: jest.fn(),
  createAgentPolicyHandler: jest.fn(),
  updateAgentPolicyHandler: jest.fn(),
  copyAgentPolicyHandler: jest.fn(),
  deleteAgentPoliciesHandler: jest.fn(),
  getFullAgentPolicy: jest.fn(),
  getK8sManifest: jest.fn(),
  bulkGetAgentPoliciesHandler: jest.fn(),
}));

jest.mock('../../services', () => ({
  agentPolicyService: {
    getFullAgentPolicy: jest.fn(),
    getFullAgentManifest: jest.fn(),
  },
  appContextService: {
    getLogger: jest.fn().mockReturnValue({ error: jest.fn() } as any),
  },
}));

jest.mock('../../services/agents', () => ({
  getLatestAvailableAgentVersion: jest.fn().mockResolvedValue('1.0.0'),
}));

describe('schema validation', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let agentPolicy: AgentPolicy;
  let fullAgentPolicy: FullAgentPolicy;

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
    agentPolicy = {
      id: 'id',
      space_ids: ['space1'],
      status: 'active',
      package_policies: [
        {
          created_at: '2022-12-19T20:43:45.879Z',
          created_by: 'elastic',
          description: '',
          enabled: true,
          id: '123',
          inputs: [
            {
              streams: [
                {
                  id: '1',
                  compiled_stream: {},
                  enabled: true,
                  keep_enabled: false,
                  release: 'beta',
                  vars: { var: { type: 'text', value: 'value', frozen: false } },
                  config: { config: { type: 'text', value: 'value', frozen: false } },
                  data_stream: { dataset: 'apache.access', type: 'logs', elasticsearch: {} },
                },
              ],
              compiled_input: '',
              id: '1',
              enabled: true,
              type: 'logs',
              policy_template: '',
              keep_enabled: false,
              vars: { var: { type: 'text', value: 'value', frozen: false } },
              config: { config: { type: 'text', value: 'value', frozen: false } },
            },
          ],
          vars: { var: { type: 'text', value: 'value', frozen: false } },
          name: 'Package Policy 123',
          namespace: 'default',
          package: {
            name: 'a-package',
            title: 'package A',
            version: '1.0.0',
            experimental_data_stream_features: [{ data_stream: 'logs', features: { tsdb: true } }],
            requires_root: false,
          },
          policy_id: 'agent-policy-id-a',
          policy_ids: ['agent-policy-id-a'],
          revision: 1,
          updated_at: '2022-12-19T20:43:45.879Z',
          updated_by: 'elastic',
          version: '1.0.0',
          secret_references: [
            {
              id: 'ref1',
            },
          ],
          elasticsearch: {
            'index_template.mappings': {
              dynamic_templates: [],
            },
          },
        },
      ],
      is_managed: true,
      updated_at: '2020-01-01',
      updated_by: 'user',
      revision: 1,
      agents: 1,
      unprivileged_agents: 1,
      is_protected: true,
      version: '1',
      name: 'name',
      namespace: 'namespace',
      description: 'description',
      is_default: true,
      is_default_fleet_server: true,
      has_fleet_server: true,
      monitoring_enabled: ['metrics'],
      unenroll_timeout: 1,
      inactivity_timeout: 1,
      is_preconfigured: true,
      data_output_id: 'data_output_id',
      monitoring_output_id: 'monitoring_output_id',
      download_source_id: 'download_source_id',
      fleet_server_host_id: 'fleet_server_host_id',
      schema_version: '1',
      agent_features: [{ name: 'name', enabled: true }],
      overrides: { key: 'value' },
      advanced_settings: {
        agent_download_timeout: '2h',
        agent_limits_go_max_procs: 1,
        agent_logging_level: 'info',
        agent_logging_metrics_period: '30s',
        agent_logging_to_files: true,
        agent_logging_files_rotateeverybytes: 10000,
        agent_logging_files_keepfiles: 10,
        agent_logging_files_interval: '7h',
      },
      keep_monitoring_alive: true,
      supports_agentless: true,
      global_data_tags: [{ name: 'name', value: 'value' }],
      monitoring_pprof_enabled: true,
      monitoring_http: {
        enabled: true,
        host: 'host',
        port: 1,
        buffer: {
          enabled: true,
        },
      },
      monitoring_diagnostics: {
        limit: {
          interval: '1s',
          burst: 1,
        },
        uploader: {
          max_retries: 1,
          init_dur: '1s',
          max_dur: '1s',
        },
      },
    };
    fullAgentPolicy = {
      id: 'id',
      namespaces: ['namespace'],
      outputs: {
        outputId: {
          type: 'elasticsearch',
          hosts: ['host'],
          ca_sha256: 'ca_sha256',
          proxy_url: 'proxy_url',
          proxy_headers: 'proxy_headers',
          key: 'value',
        },
      },
      output_permissions: {
        outputId: {
          role: {
            cluster: ['all'],
            index: [],
          },
        },
      },
      fleet: {
        hosts: ['host'],
        proxy_url: 'proxy_url',
        proxy_headers: 'proxy_headers',
        ssl: {
          verification_mode: 'verification_mode',
          certificate_authorities: ['certificate_authorities'],
          certificate: 'certificate',
          key: 'key',
          renegotiation: 'renegotiation',
        },
      },
      inputs: [
        {
          id: 'id',
          name: 'name',
          revision: 1,
          type: 'type',
          data_stream: {
            namespace: 'namespace',
          },
          use_output: 'use_output',
          package_policy_id: 'package_policy_id',
          meta: {
            package: {
              name: 'name',
              version: 'version',
            },
            title: 'title',
          },
          streams: [
            {
              id: 'id',
              data_stream: {
                dataset: 'dataset',
                type: 'type',
              },
              key: 'value',
            },
          ],
          processors: [
            {
              add_fields: {
                target: 'target',
                fields: {
                  key: 'value',
                },
              },
            },
          ],
          key: 'value',
        },
      ],
      revision: 1,
      agent: {
        monitoring: {
          namespace: 'namespace',
          use_output: 'use_output',
          enabled: true,
          metrics: true,
          logs: true,
          traces: true,
        },
        download: {
          sourceURI: 'sourceURI',
        },
        features: {
          feature: {
            enabled: true,
          },
        },
        protection: {
          enabled: true,
          uninstall_token_hash: 'hash',
          signing_key: 'key',
        },
      },
      secret_references: [
        {
          id: 'ref',
        },
      ],
      signed: {
        data: 'data',
        signature: 'signature',
      },
    };
  });

  it('list agent policies should return valid response', async () => {
    const testAgentPolicy: AgentPolicy = {
      id: 'id',
      status: 'active',
      is_managed: true,
      updated_at: '2020-01-01',
      updated_by: 'user',
      revision: 1,
      is_protected: true,
      name: 'name',
      namespace: 'namespace',
      data_output_id: null,
      monitoring_output_id: null,
      download_source_id: null,
      fleet_server_host_id: null,
      keep_monitoring_alive: null,
      supports_agentless: null,
      inactivity_timeout: 1209600,
    };
    const expectedResponse = {
      items: [testAgentPolicy],
      total: 1,
      page: 1,
      perPage: 20,
    };
    (getAgentPoliciesHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getAgentPoliciesHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = ListResponseSchema(AgentPolicyResponseSchema).validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('bulk get agent policies should return valid response', async () => {
    const expectedResponse = {
      items: [agentPolicy],
    };
    (bulkGetAgentPoliciesHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await bulkGetAgentPoliciesHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = BulkGetAgentPoliciesResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get agent policy should return valid response', async () => {
    const expectedResponse = {
      item: agentPolicy,
    };
    (getOneAgentPolicyHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getOneAgentPolicyHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetAgentPolicyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('delete agent policy should return valid response', async () => {
    const expectedResponse = {
      id: 'id',
      name: 'name',
    };
    (deleteAgentPoliciesHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await deleteAgentPoliciesHandler(context, { body: { agentPolicyId: 'id' } } as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = DeleteAgentPolicyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('create agent policy should return valid response', async () => {
    const expectedResponse = {
      item: agentPolicy,
    };
    (createAgentPolicyHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await createAgentPolicyHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetAgentPolicyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('update agent policy should return valid response', async () => {
    const expectedResponse = {
      item: agentPolicy,
    };
    (updateAgentPolicyHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await updateAgentPolicyHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetAgentPolicyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('copy agent policy should return valid response', async () => {
    const expectedResponse = {
      item: agentPolicy,
    };
    (copyAgentPolicyHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await copyAgentPolicyHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetAgentPolicyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get full agent policy should return valid response as object', async () => {
    const testPolicy: FullAgentPolicy = {
      id: 'id',
      namespaces: ['namespace'],
      outputs: {
        outputId: {
          type: 'elasticsearch',
          hosts: ['host'],
          ca_sha256: 'ca_sha256',
          proxy_url: 'proxy_url',
          proxy_headers: 'proxy_headers',
          key: 'value',
        },
      },
      output_permissions: {
        outputId: {
          role: {
            cluster: ['all'],
            index: [],
          },
        },
      },
      fleet: {
        hosts: ['host'],
        proxy_url: 'proxy_url',
        proxy_headers: 'proxy_headers',
        ssl: {
          verification_mode: 'verification_mode',
          certificate_authorities: ['certificate_authorities'],
          certificate: 'certificate',
          key: 'key',
          renegotiation: 'renegotiation',
        },
      },
      inputs: [
        {
          id: 'id',
          name: 'name',
          revision: 1,
          type: 'type',
          data_stream: {
            namespace: 'namespace',
          },
          use_output: 'use_output',
          package_policy_id: 'package_policy_id',
          meta: {
            package: {
              name: 'name',
              version: 'version',
            },
            title: 'title',
          },
          streams: [
            {
              id: 'id',
              data_stream: {
                dataset: 'dataset',
                type: 'type',
              },
              key: 'value',
            },
          ],
          processors: [
            {
              add_fields: {
                target: 'target',
                fields: {
                  key: 'value',
                },
              },
            },
          ],
          key: 'value',
        },
      ],
      revision: 1,
      agent: {
        monitoring: {
          namespace: 'namespace',
          use_output: 'use_output',
          enabled: true,
          metrics: true,
          logs: true,
          traces: true,
        },
        download: {
          sourceURI: 'sourceURI',
        },
        features: {
          feature: {
            enabled: true,
          },
        },
        protection: {
          enabled: true,
          uninstall_token_hash: 'hash',
          signing_key: 'key',
        },
      },
      secret_references: [
        {
          id: 'ref',
        },
      ],
      signed: {
        data: 'data',
        signature: 'signature',
      },
    };
    const expectedResponse = {
      item: testPolicy,
    };
    (getFullAgentPolicy as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getFullAgentPolicy(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetFullAgentPolicyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get full agent policy should return valid response as minimal object', async () => {
    const testPolicy: FullAgentPolicy = {
      id: 'id',
      outputs: {},
      fleet: {
        kibana: {
          hosts: ['host'],
          protocol: 'protocol',
          path: 'path',
        },
      },
      inputs: [],
    };
    const expectedResponse = {
      item: testPolicy,
    };
    (getFullAgentPolicy as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getFullAgentPolicy(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetFullAgentPolicyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get full agent policy should return valid response as string', async () => {
    const expectedResponse = {
      item: 'policy',
    };
    (getFullAgentPolicy as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getFullAgentPolicy(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetFullAgentPolicyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('download full agent policy should return valid response', async () => {
    const expectedResponse = fullAgentPolicyToYaml(fullAgentPolicy, dump);
    (agentPolicyService.getFullAgentPolicy as jest.Mock).mockResolvedValue(fullAgentPolicy);
    await downloadFullAgentPolicy(
      context,
      { params: { agentPolicyId: 'policy1' }, query: { kubernetes: false } } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
      headers: {
        'content-disposition': 'attachment; filename="elastic-agent.yml"',
        'content-type': 'text/x-yaml',
      },
    });
    const validationResp = DownloadFullAgentPolicyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get k8s manifest should return valid response', async () => {
    const expectedResponse = {
      item: 'manifest',
    };
    (getK8sManifest as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getK8sManifest(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetK8sManifestResponseScheme.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('download k8s manifest should return valid response', async () => {
    const expectedResponse = 'manifest';

    (agentPolicyService.getFullAgentManifest as jest.Mock).mockResolvedValue(expectedResponse);
    await downloadK8sManifest(context, { query: {} } as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
      headers: {
        'content-disposition': 'attachment; filename="elastic-agent-managed-kubernetes.yml"',
        'content-type': 'text/x-yaml',
      },
    });
    const validationResp = schema.string().validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });
});
