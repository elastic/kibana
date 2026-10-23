/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendCreateAgentlessPolicy, sendGetPackageInfoByKey } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { AuthenticateAndDeployStepState } from '../../onboarding_flow_context';
import type { ServiceInstance } from '../service_settings_step/use_service_settings';
import { buildAgentlessPolicyRequest, deployGroup } from './deploy_groups';
import type { DeployGroup } from './deploy_groups';

jest.mock('@kbn/fleet-plugin/public', () => ({
  sendCreateAgentlessPolicy: jest.fn(),
  sendGetPackageInfoByKey: jest.fn(),
}));

const mockedGetPackageInfo = jest.mocked(sendGetPackageInfoByKey);
const mockedCreate = jest.mocked(sendCreateAgentlessPolicy);

const service = {
  id: 'cloudtrail',
  packageName: 'aws',
  dataStreams: [],
  deploymentMethods: [{ method: 'managed_integration', preferred: true }],
} as unknown as AwsServiceMatrixEntry;
const instance: ServiceInstance = {
  instanceId: 'cloudtrail',
  serviceId: 'cloudtrail',
  name: 'CloudTrail',
  isDuplicate: false,
};
const group: DeployGroup = {
  groupId: 'aws',
  instanceIds: ['cloudtrail'],
  members: [{ instance, service }],
  isDuplicateGroup: false,
  namespace: 'default',
};
const options = {
  namespace: 'default',
  globalRegion: 'us-east-1',
  storedServiceVars: { cloudtrail: { enabledDataStreams: [], varsByDataStream: {} } },
  authenticateAndDeployStep: { connectorId: 'cc-1' } as AuthenticateAndDeployStepState,
};

describe('buildAgentlessPolicyRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPackageInfo.mockResolvedValue({
      data: {
        item: {
          name: 'aws',
          version: '3.0.0',
          policy_templates: [{ name: 'cloudtrail', inputs: [{ type: 'aws-s3' }] }],
        },
      },
    } as any);
    mockedCreate.mockResolvedValue({ item: { id: 'pp-1' } } as any);
  });

  it('builds the body deployGroup sends, without the connector', async () => {
    const request = await buildAgentlessPolicyRequest(group, options);

    expect(request).toEqual({
      name: expect.stringContaining('aws'),
      namespace: 'default',
      package: { name: 'aws', version: '3.0.0' },
      inputs: { 'cloudtrail-aws-s3': { enabled: false, streams: {} } },
    });
    expect(request).not.toHaveProperty('cloud_connector');
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('deployGroup sends that body plus the connector', async () => {
    const outcome = await deployGroup(group, options);

    expect(outcome).toEqual({ policyId: 'pp-1' });
    expect(mockedCreate).toHaveBeenCalledWith({
      name: expect.stringContaining('aws'),
      namespace: 'default',
      package: { name: 'aws', version: '3.0.0' },
      inputs: { 'cloudtrail-aws-s3': { enabled: false, streams: {} } },
      cloud_connector: { enabled: true, cloud_connector_id: 'cc-1', target_csp: 'aws' },
    });
  });
});
