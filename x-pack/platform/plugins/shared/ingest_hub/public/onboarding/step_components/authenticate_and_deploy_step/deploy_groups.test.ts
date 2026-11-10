/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendCreateAgentlessPolicy, sendGetPackageInfoByKey } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { deployGroup } from './deploy_groups';
import type { DeployGroup } from './deploy_groups';

jest.mock('@kbn/fleet-plugin/public', () => ({
  sendCreateAgentlessPolicy: jest.fn(),
  sendGetPackageInfoByKey: jest.fn(),
}));

const mockCreatePolicy = sendCreateAgentlessPolicy as jest.Mock;
const mockGetPackageInfo = sendGetPackageInfoByKey as jest.Mock;

/**
 * Bedrock shape: metrics stream on by default, CloudWatch log stream off by default.
 */
const bedrock = {
  id: 'bedrock',
  name: 'Amazon Bedrock',
  signalTypes: ['metrics', 'logs'],
  dataStreams: ['guardrails', 'invocation'],
  packageName: 'aws',
  deploymentMethods: [{ method: 'managed_integration', preferred: true }],
  inputs: ['aws/metrics', 'aws-cloudwatch'],
  requiredConfig: [],
  defaultEnabled: true,
  defaultEnabledInputs: ['aws/metrics'],
  showInUI: true,
  isManifestLoaded: true,
  isManifestError: false,
  isStaticAgentBasedOnly: false,
  varDefsByInput: { 'aws/metrics': {}, 'aws-cloudwatch': {} },
  varDefsByDataStream: {
    guardrails: {
      inputs: ['aws/metrics'],
      defaultEnabledInputs: ['aws/metrics'],
      varDefsByInput: { 'aws/metrics': {} },
    },
    invocation: {
      inputs: ['aws-cloudwatch'],
      defaultEnabledInputs: [],
      varDefsByInput: { 'aws-cloudwatch': {} },
    },
  },
} as unknown as AwsServiceMatrixEntry;

const group: DeployGroup = {
  groupId: 'aws',
  instanceIds: ['bedrock'],
  members: [
    {
      instance: {
        instanceId: 'bedrock',
        serviceId: 'bedrock',
        name: 'Amazon Bedrock',
        isDuplicate: false,
      },
      service: bedrock,
    },
  ],
  isDuplicateGroup: false,
  namespace: '',
};

describe('deployGroup — never-configured service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPackageInfo.mockResolvedValue({
      data: {
        item: {
          version: '1.0.0',
          policy_templates: [
            { name: 'bedrock', inputs: [{ type: 'aws/metrics' }, { type: 'aws-cloudwatch' }] },
          ],
        },
      },
    });
    mockCreatePolicy.mockResolvedValue({ item: { id: 'policy-1' } });
  });

  it('sends only the data streams the manifest enables by default', async () => {
    await deployGroup(group, {
      namespace: 'default',
      globalRegion: 'us-east-1',
      storedServiceVars: {},
      authenticateAndDeployStep: {},
    } as unknown as Parameters<typeof deployGroup>[1]);

    const { inputs } = mockCreatePolicy.mock.calls[0][0];
    expect(Object.keys(inputs['bedrock-aws/metrics'].streams)).toEqual(['aws.guardrails']);
    expect(inputs['bedrock-aws-cloudwatch']).toStrictEqual({ enabled: false, streams: {} });
  });
});

describe('deployGroup — proxy URL', () => {
  const ec2 = {
    id: 'ec2',
    name: 'Amazon EC2',
    packageName: 'aws',
    dataStreams: ['ec2'],
    inputs: ['aws-s3'],
    showInUI: true,
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    varDefsByInput: {},
    varDefsByDataStream: {},
  } as unknown as AwsServiceMatrixEntry;

  const ec2Group: DeployGroup = {
    groupId: 'aws',
    instanceIds: ['ec2'],
    members: [
      {
        instance: { instanceId: 'ec2', serviceId: 'ec2', name: 'Amazon EC2', isDuplicate: false },
        service: ec2,
      },
    ],
    isDuplicateGroup: false,
    namespace: '',
  };

  const deploy = async (proxyUrl: string | undefined, pkgVars: string[]) => {
    mockGetPackageInfo.mockResolvedValue({
      data: {
        item: {
          version: '1.0.0',
          vars: pkgVars.map((name) => ({ name })),
          policy_templates: [],
        },
      },
    });
    await deployGroup(ec2Group, {
      namespace: 'default',
      globalRegion: 'us-east-1',
      storedServiceVars: {},
      authenticateAndDeployStep: {} as never,
      integrationName: 'aws-1',
      policySettings: proxyUrl === undefined ? {} : { proxy_url: proxyUrl },
    });
    return mockCreatePolicy.mock.calls[0][0];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePolicy.mockResolvedValue({ item: { id: 'policy-1' } });
  });

  it('sends the proxy as a package var, not a top-level field', async () => {
    const body = await deploy('http://proxy:3128', ['proxy_url']);
    expect(body.vars).toEqual({ proxy_url: 'http://proxy:3128' });
    expect(body).not.toHaveProperty('proxy_url');
  });

  it('sends the trimmed value', async () => {
    expect((await deploy('  http://proxy:3128 ', ['proxy_url'])).vars).toEqual({
      proxy_url: 'http://proxy:3128',
    });
  });

  it('leaves it out when empty', async () => {
    expect((await deploy('', ['proxy_url'])).vars).toBeUndefined();
  });

  it('leaves it out when never set', async () => {
    expect((await deploy(undefined, ['proxy_url'])).vars).toBeUndefined();
  });

  it('leaves it out when the package does not declare the var', async () => {
    expect((await deploy('http://proxy:3128', ['default_region'])).vars).toEqual({
      default_region: 'us-east-1',
    });
  });

  it('does not send the agent-based only output', async () => {
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '1.0.0', vars: [], policy_templates: [] } },
    });
    await deployGroup(ec2Group, {
      namespace: 'default',
      globalRegion: '',
      storedServiceVars: {},
      authenticateAndDeployStep: {} as never,
      policySettings: { output_id: 'logstash-1', proxy_url: 'http://proxy:3128' },
    });
    expect(mockCreatePolicy.mock.calls[0][0]).not.toHaveProperty('output_id');
  });
});

describe('deployGroup — dedicated index template for a custom dataset', () => {
  const otel = {
    id: 'ec2',
    name: 'Amazon EC2',
    packageName: 'aws_cloudwatch_input_otel',
    dataStreams: ['ec2'],
    inputs: ['otelcol'],
    showInUI: true,
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    varDefsByInput: {},
    varDefsByDataStream: {
      ec2: {
        inputs: ['otelcol'],
        defaultEnabledInputs: ['otelcol'],
        varDefsByInput: {
          otelcol: { 'data_stream.dataset': { name: 'data_stream.dataset', default: 'aws.ec2' } },
        },
      },
    },
  } as unknown as AwsServiceMatrixEntry;

  const otelGroup: DeployGroup = {
    groupId: 'aws_cloudwatch_input_otel',
    instanceIds: ['ec2'],
    members: [
      {
        instance: { instanceId: 'ec2', serviceId: 'ec2', name: 'Amazon EC2', isDuplicate: false },
        service: otel,
      },
    ],
    isDuplicateGroup: false,
    namespace: '',
  };

  const deploy = async (dataset: string, createDatasetTemplates?: boolean) => {
    await deployGroup(otelGroup, {
      namespace: 'default',
      globalRegion: 'us-east-1',
      storedServiceVars: {
        ec2: {
          enabledDataStreams: ['ec2'],
          varsByDataStream: {
            ec2: {
              enabledInputs: ['otelcol'],
              varsByInput: { otelcol: { 'data_stream.dataset': dataset } },
              ...(createDatasetTemplates !== undefined ? { createDatasetTemplates } : {}),
            },
          },
        },
      },
      authenticateAndDeployStep: {} as never,
    });
    return mockCreatePolicy.mock.calls[0][0];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPackageInfo.mockResolvedValue({
      data: { item: { version: '1.0.0', policy_templates: [] } },
    });
    mockCreatePolicy.mockResolvedValue({ item: { id: 'policy-1' } });
  });

  it('asks Fleet not to create the template when the user opted out', async () => {
    expect(await deploy('aws.prod', false)).toHaveProperty('create_dataset_templates', false);
  });

  it('leaves the flag out by default so Fleet keeps its own', async () => {
    expect(await deploy('aws.prod')).not.toHaveProperty('create_dataset_templates');
  });

  it('ignores an opt-out once the dataset is back to the default', async () => {
    expect(await deploy('aws.ec2', false)).not.toHaveProperty('create_dataset_templates');
  });

  it('never sends the choice as a package var', async () => {
    const body = await deploy('aws.prod', false);
    expect(JSON.stringify(body.inputs)).not.toContain('createDatasetTemplates');
  });
});
