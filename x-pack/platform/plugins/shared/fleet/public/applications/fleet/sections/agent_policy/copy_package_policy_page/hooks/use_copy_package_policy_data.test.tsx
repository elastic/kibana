/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';

import {
  sendGetAgentlessPolicy,
  sendGetPackageInfoByKeyForRq,
  useGetOnePackagePolicyQuery,
} from '../../../../../../hooks';
import { createFleetTestRendererMock } from '../../../../../../mock';
import nginxPackageInfo from '../../../../../../../server/services/package_policies/fixtures/package_info/nginx_1.5.0.json';

import { useCopyPackagePolicyData } from './use_copy_package_policy_data';

// Mock the leaf `use_request` module (like the edit hook test) so the real inverse mapper
// (`agentlessPolicyToPackagePolicy`) still runs against the nginx fixture below.
jest.mock('../../../../../../hooks/use_request', () => ({
  ...jest.requireActual('../../../../../../hooks/use_request'),
  useGetOnePackagePolicyQuery: jest.fn(),
  sendGetAgentlessPolicy: jest.fn(),
  sendGetPackageInfoByKeyForRq: jest.fn(),
}));

describe('useCopyPackagePolicyData', () => {
  const agentlessPolicy = {
    id: 'agentless-1',
    name: 'agentless-1',
    namespace: 'default',
    package: { name: 'nginx', title: 'Nginx', version: '1.5.0' },
    inputs: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useGetOnePackagePolicyQuery)
      .mockReturnValue({ data: undefined, isLoading: false } as any);
  });

  it('reads the package policy directly for a traditional copy', async () => {
    jest.mocked(useGetOnePackagePolicyQuery).mockReturnValue({
      data: { item: { id: 'pp-1', name: 'pp' } },
      isLoading: false,
    } as any);

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      useCopyPackagePolicyData('pp-1', { isAgentless: false })
    );

    await waitFor(() => expect(result.current.item).toEqual({ id: 'pp-1', name: 'pp' }));

    expect(useGetOnePackagePolicyQuery).toHaveBeenCalledWith('pp-1', { enabled: true });
    // The agentless API is never touched for a traditional copy.
    expect(sendGetAgentlessPolicy).not.toHaveBeenCalled();
  });

  it('hydrates an agentless copy through the agentless API and inverse mapper', async () => {
    jest.mocked(sendGetAgentlessPolicy).mockResolvedValue({ item: agentlessPolicy } as any);
    jest.mocked(sendGetPackageInfoByKeyForRq).mockResolvedValue({ item: nginxPackageInfo } as any);

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      useCopyPackagePolicyData('agentless-1', { isAgentless: true })
    );

    // The inverse mapper carries the source id through onto the expanded package policy.
    await waitFor(() => expect(result.current.item?.id).toBe('agentless-1'));

    expect(sendGetAgentlessPolicy).toHaveBeenCalledWith('agentless-1');
    expect(result.current.item?.name).toBe('agentless-1');
    expect(result.current.item?.supports_agentless).toBe(true);
    // The package-policy read is disabled so exactly one API is used for an agentless copy.
    expect(useGetOnePackagePolicyQuery).toHaveBeenCalledWith('agentless-1', { enabled: false });
  });

  it('returns no item and stops loading when the agentless read fails', async () => {
    jest.mocked(sendGetAgentlessPolicy).mockRejectedValue(new Error('boom'));

    // Use a distinct id so this doesn't hit the react-query cache from the success case above.
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      useCopyPackagePolicyData('agentless-failure', { isAgentless: true })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.item).toBeUndefined();
  });
});
