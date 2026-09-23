/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';

import { AWS_IDENTITY_FEDERATION_ENABLED_FLAG } from '../../common/constants/cloud_connector';
import { AWS_WORKLOAD_IDENTITY_CLOUD_FORMATION_TEMPLATE_URL } from '../components/cloud_connector/constants';

import { useStartServices } from './use_core';
import {
  useAwsWorkloadIdentityTemplateEnabled,
  useAwsIdentityFederationTemplateUrl,
} from './use_aws_workload_identity_template';

jest.mock('./use_core');

const mockUseStartServices = useStartServices as jest.MockedFunction<typeof useStartServices>;

const PACKAGE_URL =
  'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://example.com/legacy.yml&param_ElasticResourceId=RESOURCE_ID';

describe('useAwsWorkloadIdentityTemplateEnabled', () => {
  let flag$: BehaviorSubject<boolean>;
  const getBooleanValue$ = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    flag$ = new BehaviorSubject<boolean>(false);
    getBooleanValue$.mockReturnValue(flag$.asObservable());
    mockUseStartServices.mockReturnValue({ featureFlags: { getBooleanValue$ } } as any);
  });

  it('reuses the aws identity federation flag, with its enabled fallback', () => {
    renderHook(() => useAwsWorkloadIdentityTemplateEnabled());
    expect(getBooleanValue$).toHaveBeenCalledWith(AWS_IDENTITY_FEDERATION_ENABLED_FLAG, true);
  });

  it('follows the flag value and reacts to a LaunchDarkly flip', () => {
    const { result } = renderHook(() => useAwsWorkloadIdentityTemplateEnabled());
    expect(result.current).toBe(false);

    act(() => flag$.next(true));
    expect(result.current).toBe(true);

    act(() => flag$.next(false));
    expect(result.current).toBe(false);
  });

  it('subscribes once across re-renders', () => {
    const { rerender } = renderHook(() => useAwsWorkloadIdentityTemplateEnabled());
    rerender();
    rerender();
    expect(getBooleanValue$).toHaveBeenCalledTimes(1);
  });
});

describe('useAwsIdentityFederationTemplateUrl', () => {
  let flag$: BehaviorSubject<boolean>;

  beforeEach(() => {
    jest.clearAllMocks();
    flag$ = new BehaviorSubject<boolean>(false);
    mockUseStartServices.mockReturnValue({
      featureFlags: { getBooleanValue$: jest.fn().mockReturnValue(flag$.asObservable()) },
    } as any);
  });

  it('passes the package URL through while the flag is off', () => {
    const { result } = renderHook(() =>
      useAwsIdentityFederationTemplateUrl({
        packageName: 'aws',
        iacTemplateUrl: PACKAGE_URL,
      })
    );
    expect(result.current).toBe(PACKAGE_URL);
  });

  it('switches to the hardcoded Workload Identity URL when the flag turns on', () => {
    const { result } = renderHook(() =>
      useAwsIdentityFederationTemplateUrl({
        packageName: 'aws',
        iacTemplateUrl: PACKAGE_URL,
      })
    );
    act(() => flag$.next(true));
    expect(result.current).toBe(AWS_WORKLOAD_IDENTITY_CLOUD_FORMATION_TEMPLATE_URL);
  });

  it('leaves packages outside the list alone even with the flag on', () => {
    flag$.next(true);
    const { result } = renderHook(() =>
      useAwsIdentityFederationTemplateUrl({
        packageName: 'cloud_security_posture',
        iacTemplateUrl: PACKAGE_URL,
      })
    );
    expect(result.current).toBe(PACKAGE_URL);
  });
});
