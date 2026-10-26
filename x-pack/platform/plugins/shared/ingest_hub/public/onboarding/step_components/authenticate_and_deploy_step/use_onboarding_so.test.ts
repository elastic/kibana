/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  sendCreateCloudOnboardingDeployment,
  sendUpdateCloudOnboardingDeployment,
} from '@kbn/fleet-plugin/public';

import { useAwsServiceMatrix } from '../../use_aws_service_matrix';

import { useOnboardingSO } from './use_onboarding_so';

jest.mock('@kbn/fleet-plugin/public', () => ({
  sendCreateCloudOnboardingDeployment: jest.fn(),
  sendUpdateCloudOnboardingDeployment: jest.fn(),
}));
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { notifications: { toasts: { addDanger: jest.fn() } } } }),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => ({ replace: jest.fn(), location: {} }),
  useParams: () => ({ integrationId: 'aws' }),
}));
jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: () => ({ updateDetectAndReviewStep: jest.fn() }),
}));
jest.mock('../../use_aws_service_matrix');

const mockCreate = sendCreateCloudOnboardingDeployment as jest.Mock;
const mockUpdate = sendUpdateCloudOnboardingDeployment as jest.Mock;
const mockUseAwsServiceMatrix = useAwsServiceMatrix as jest.Mock;

const matrix = [
  { id: 'cloudtrail', name: 'AWS CloudTrail', packageName: 'aws', showInUI: true, signalTypes: [] },
  { id: 'vpcflow', name: 'AWS VPC Flow Logs', packageName: 'aws', showInUI: true, signalTypes: [] },
  {
    id: 'bedrock',
    name: 'Amazon Bedrock',
    packageName: 'aws_bedrock',
    showInUI: true,
    signalTypes: [],
  },
];

describe('useOnboardingSO service details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ item: { id: 'd1' } });
    mockUpdate.mockResolvedValue({ item: { id: 'd1' } });
    mockUseAwsServiceMatrix.mockReturnValue({ matrix });
  });

  const baseCreate: { provider: 'aws'; mechanisms: Array<'managed_integration'> } = {
    provider: 'aws',
    mechanisms: ['managed_integration'],
  };

  it('adds the distinct packages of the services to a create', async () => {
    const { result } = renderHook(() => useOnboardingSO());

    await result.current.createDeployment({
      ...baseCreate,
      services: ['cloudtrail', 'vpcflow', 'bedrock'],
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        packageNames: ['aws', 'aws_bedrock'],
        serviceNames: {
          cloudtrail: 'AWS CloudTrail',
          vpcflow: 'AWS VPC Flow Logs',
          bedrock: 'Amazon Bedrock',
        },
      })
    );
  });

  it('adds the packages to an update that carries the services', async () => {
    const { result } = renderHook(() => useOnboardingSO());

    await result.current.updateDeployment('d1', { services: ['bedrock'] });

    expect(mockUpdate).toHaveBeenCalledWith('d1', {
      services: ['bedrock'],
      packageNames: ['aws_bedrock'],
      serviceNames: { bedrock: 'Amazon Bedrock' },
    });
  });

  it('leaves an update without services untouched', async () => {
    const { result } = renderHook(() => useOnboardingSO());

    await result.current.updateDeployment('d1', { status: 'failed' });

    expect(mockUpdate).toHaveBeenCalledWith('d1', { status: 'failed' });
  });

  it('writes without packages until the service matrix has loaded', async () => {
    mockUseAwsServiceMatrix.mockReturnValue({ matrix: undefined });
    const { result } = renderHook(() => useOnboardingSO());

    await result.current.updateDeployment('d1', { services: ['cloudtrail'] });

    expect(mockUpdate).toHaveBeenCalledWith('d1', { services: ['cloudtrail'] });
  });
});
