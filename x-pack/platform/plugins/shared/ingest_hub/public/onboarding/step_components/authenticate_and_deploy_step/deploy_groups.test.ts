/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/fleet-plugin/public', () => ({
  sendCreateAgentlessPolicy: jest.fn(),
  sendGetPackageInfoByKey: jest.fn(),
}));

import { sendCreateAgentlessPolicy, sendGetPackageInfoByKey } from '@kbn/fleet-plugin/public';

import { deployGroup, type DeployGroup } from './deploy_groups';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

const mockCreateAgentless = sendCreateAgentlessPolicy as jest.Mock;
const mockGetPackageInfo = sendGetPackageInfoByKey as jest.Mock;

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

const group: DeployGroup = {
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
  await deployGroup(group, {
    namespace: 'default',
    globalRegion: 'us-east-1',
    storedServiceVars: {},
    authenticateAndDeployStep: {} as never,
    integrationName: 'aws-1',
    policySettings: proxyUrl === undefined ? {} : { proxy_url: proxyUrl },
  });
  return mockCreateAgentless.mock.calls[0][0];
};

describe('deployGroup — proxy URL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAgentless.mockResolvedValue({ item: { id: 'policy-1' } });
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

  it('leaves it out when empty or never set', async () => {
    expect((await deploy('', ['proxy_url'])).vars).toBeUndefined();
    jest.clearAllMocks();
    mockCreateAgentless.mockResolvedValue({ item: { id: 'policy-1' } });
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
    await deployGroup(group, {
      namespace: 'default',
      globalRegion: '',
      storedServiceVars: {},
      authenticateAndDeployStep: {} as never,
      policySettings: { output_id: 'logstash-1', proxy_url: 'http://proxy:3128' },
    });
    expect(mockCreateAgentless.mock.calls[0][0]).not.toHaveProperty('output_id');
  });
});
