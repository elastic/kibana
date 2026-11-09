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
