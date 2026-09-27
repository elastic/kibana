/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { AWS_IDENTITY_FEDERATION_ENABLED_FLAG } from '@kbn/fleet-plugin/common';
import { useAwsIdentityFederationEnabled } from './use_aws_identity_federation_enabled';

const mockUseBooleanValue = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      featureFlags: {
        useBooleanValue: mockUseBooleanValue,
      },
    },
  }),
}));

describe('useAwsIdentityFederationEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the Fleet flag and defaults to enabled', () => {
    mockUseBooleanValue.mockReturnValue(true);

    const { result } = renderHook(() => useAwsIdentityFederationEnabled());

    expect(result.current).toBe(true);
    expect(mockUseBooleanValue).toHaveBeenCalledWith(AWS_IDENTITY_FEDERATION_ENABLED_FLAG, true);
  });

  it('returns false when the flag is off', () => {
    mockUseBooleanValue.mockReturnValue(false);

    const { result } = renderHook(() => useAwsIdentityFederationEnabled());

    expect(result.current).toBe(false);
  });
});
