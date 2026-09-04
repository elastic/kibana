/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';

import { AWS_IDENTITY_FEDERATION_ENABLED_FLAG } from '../../common/constants/cloud_connector';

import { useStartServices } from './use_core';
import { useDisabledIdentityFederationProviders } from './use_disabled_identity_federation_providers';

jest.mock('./use_core');

const mockUseStartServices = useStartServices as jest.MockedFunction<typeof useStartServices>;

describe('useDisabledIdentityFederationProviders', () => {
  let awsFlag$: BehaviorSubject<boolean>;
  const getBooleanValue$ = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    awsFlag$ = new BehaviorSubject<boolean>(true);
    getBooleanValue$.mockReturnValue(awsFlag$.asObservable());
    mockUseStartServices.mockReturnValue({ featureFlags: { getBooleanValue$ } } as any);
  });

  it('subscribes to the AWS flag with an enabled fallback', () => {
    renderHook(() => useDisabledIdentityFederationProviders());
    expect(getBooleanValue$).toHaveBeenCalledWith(AWS_IDENTITY_FEDERATION_ENABLED_FLAG, true);
  });

  it('disables nothing while the flag is on', () => {
    const { result } = renderHook(() => useDisabledIdentityFederationProviders());
    expect(result.current).toEqual([]);
  });

  it('disables aws when the flag is off', () => {
    awsFlag$.next(false);
    const { result } = renderHook(() => useDisabledIdentityFederationProviders());
    expect(result.current).toEqual(['aws']);
  });

  it('reacts to a LaunchDarkly flip without re-rendering from the parent', () => {
    const { result } = renderHook(() => useDisabledIdentityFederationProviders());
    expect(result.current).toEqual([]);

    act(() => awsFlag$.next(false));
    expect(result.current).toEqual(['aws']);

    act(() => awsFlag$.next(true));
    expect(result.current).toEqual([]);
  });

  it('subscribes once across re-renders', () => {
    const { rerender } = renderHook(() => useDisabledIdentityFederationProviders());
    rerender();
    rerender();
    expect(getBooleanValue$).toHaveBeenCalledTimes(1);
  });
});
