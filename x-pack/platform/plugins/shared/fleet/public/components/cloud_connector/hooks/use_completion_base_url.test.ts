/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useStartServices } from '../../../hooks';

import { useCompletionBaseUrl } from './use_completion_base_url';

jest.mock('../../../hooks', () => ({
  useStartServices: jest.fn(),
}));

const mockUseStartServices = useStartServices as jest.Mock;

describe('useCompletionBaseUrl', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://my-kibana.example.com' },
      writable: true,
      configurable: true,
    });

    mockUseStartServices.mockReturnValue({
      http: {
        basePath: {
          prepend: (path: string) => path,
        },
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('should build correct URL for CSPM integration', () => {
    const { result } = renderHook(() =>
      useCompletionBaseUrl('cloud_security_posture', 'cspm')
    );

    expect(result.current).toBe(
      'https://my-kibana.example.com/app/fleet/integrations/cloud_security_posture/complete-integration-setup/cspm'
    );
  });

  it('should build correct URL for cloud asset inventory', () => {
    const { result } = renderHook(() =>
      useCompletionBaseUrl('cloud_asset_inventory', 'asset_inventory')
    );

    expect(result.current).toBe(
      'https://my-kibana.example.com/app/fleet/integrations/cloud_asset_inventory/complete-integration-setup/asset_inventory'
    );
  });

  it('should handle missing integration param', () => {
    const { result } = renderHook(() =>
      useCompletionBaseUrl('cloud_security_posture')
    );

    expect(result.current).toBe(
      'https://my-kibana.example.com/app/fleet/integrations/cloud_security_posture/complete-integration-setup'
    );
  });

  it('should handle base path prefix (Kibana spaces)', () => {
    mockUseStartServices.mockReturnValue({
      http: {
        basePath: {
          prepend: (path: string) => `/s/my-space${path}`,
        },
      },
    });

    const { result } = renderHook(() =>
      useCompletionBaseUrl('cloud_security_posture', 'cspm')
    );

    expect(result.current).toBe(
      'https://my-kibana.example.com/s/my-space/app/fleet/integrations/cloud_security_posture/complete-integration-setup/cspm'
    );
  });

  it('should return undefined when pkgkey is empty', () => {
    const { result } = renderHook(() => useCompletionBaseUrl(''));

    expect(result.current).toBeUndefined();
  });
});
