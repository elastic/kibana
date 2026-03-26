/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useClusterConnection } from './use_cluster_connection';
import { useCloudConnectedAppContext } from '../../app_context';
import type { ClusterDetails } from '../../../types';

jest.mock('../../app_context');

describe('use_cluster_connection', () => {
  describe('useClusterConnection - auto-enable EIS', () => {
    const mockUseCloudConnectedAppContext = useCloudConnectedAppContext as jest.MockedFunction<
      typeof useCloudConnectedAppContext
    >;

    const mockSetJustConnected = jest.fn();
    const mockSetAutoEnablingEis = jest.fn();
    const mockUpdateServices = jest.fn();
    const mockAddError = jest.fn();
    const mockResendRequest = jest.fn();

    const createMockClusterDetails = (overrides: Partial<ClusterDetails> = {}): ClusterDetails => ({
      id: 'cluster-123',
      name: 'Test Cluster',
      metadata: {
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'user@example.com',
        organization_id: 'org-456',
        subscription: 'active',
      },
      self_managed_cluster: {
        id: 'es-cluster-789',
        name: 'ES Cluster',
        version: '8.15.0',
      },
      license: {
        type: 'trial',
        uid: 'license-uid-123',
      },
      services: {
        eis: {
          enabled: false,
          support: {
            supported: true,
            minimum_stack_version: '9.3.0',
            valid_license_types: ['trial', 'enterprise'],
          },
          subscription: {
            required: true,
          },
        },
      },
      ...overrides,
    });

    const createMockContext = (overrides: Record<string, any> = {}) => ({
      apiService: {
        useLoadClusterDetails: jest.fn().mockReturnValue({
          data: createMockClusterDetails(),
          isLoading: false,
          error: null,
          resendRequest: mockResendRequest,
        }),
        updateServices: mockUpdateServices,
      },
      justConnected: false,
      setJustConnected: mockSetJustConnected,
      autoEnablingEis: false,
      setAutoEnablingEis: mockSetAutoEnablingEis,
      hasConfigurePermission: true,
      notifications: {
        toasts: {
          addError: mockAddError,
        },
      },
      ...overrides,
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should auto-enable EIS when justConnected is true and all conditions are met', async () => {
      mockUpdateServices.mockResolvedValue({ data: { success: true }, error: null });

      mockUseCloudConnectedAppContext.mockReturnValue(
        createMockContext({ justConnected: true }) as any
      );

      renderHook(() => useClusterConnection());

      await waitFor(() => {
        expect(mockSetJustConnected).toHaveBeenCalledWith(false);
        expect(mockSetAutoEnablingEis).toHaveBeenCalledWith(true);
        expect(mockUpdateServices).toHaveBeenCalledWith({ eis: { enabled: true } });
        expect(mockSetAutoEnablingEis).toHaveBeenCalledWith(false);
      });
    });

    it('should not auto-enable EIS when justConnected is false', () => {
      mockUseCloudConnectedAppContext.mockReturnValue(
        createMockContext({ justConnected: false }) as any
      );

      renderHook(() => useClusterConnection());

      expect(mockUpdateServices).not.toHaveBeenCalled();
    });

    it('should not auto-enable EIS when EIS is already enabled', () => {
      const clusterDetailsWithEisEnabled = createMockClusterDetails({
        services: {
          eis: {
            enabled: true,
            support: { supported: true },
            subscription: { required: true },
          },
        },
      });

      mockUseCloudConnectedAppContext.mockReturnValue(
        createMockContext({
          justConnected: true,
          apiService: {
            useLoadClusterDetails: jest.fn().mockReturnValue({
              data: clusterDetailsWithEisEnabled,
              isLoading: false,
              error: null,
              resendRequest: mockResendRequest,
            }),
            updateServices: mockUpdateServices,
          },
        }) as any
      );

      renderHook(() => useClusterConnection());

      expect(mockSetJustConnected).toHaveBeenCalledWith(false);
      expect(mockUpdateServices).not.toHaveBeenCalled();
    });

    it('should not auto-enable EIS when user does not have configure permission', () => {
      mockUseCloudConnectedAppContext.mockReturnValue(
        createMockContext({
          justConnected: true,
          hasConfigurePermission: false,
        }) as any
      );

      renderHook(() => useClusterConnection());

      expect(mockSetJustConnected).toHaveBeenCalledWith(false);
      expect(mockUpdateServices).not.toHaveBeenCalled();
    });

    it('should not auto-enable EIS when subscription is required but not active', () => {
      const clusterDetailsWithInactiveSubscription = createMockClusterDetails({
        metadata: {
          created_at: '2024-01-01T00:00:00Z',
          created_by: 'user@example.com',
          organization_id: 'org-456',
          subscription: 'expired',
        },
      });

      mockUseCloudConnectedAppContext.mockReturnValue(
        createMockContext({
          justConnected: true,
          apiService: {
            useLoadClusterDetails: jest.fn().mockReturnValue({
              data: clusterDetailsWithInactiveSubscription,
              isLoading: false,
              error: null,
              resendRequest: mockResendRequest,
            }),
            updateServices: mockUpdateServices,
          },
        }) as any
      );

      renderHook(() => useClusterConnection());

      expect(mockSetJustConnected).toHaveBeenCalledWith(false);
      expect(mockUpdateServices).not.toHaveBeenCalled();
    });

    it('should show error toast when auto-enable fails', async () => {
      const mockError = new Error('Failed to enable EIS');
      mockUpdateServices.mockResolvedValue({ data: null, error: mockError });

      mockUseCloudConnectedAppContext.mockReturnValue(
        createMockContext({ justConnected: true }) as any
      );

      renderHook(() => useClusterConnection());

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(mockError, {
          title: 'Failed to auto-enable Elastic Inference Service',
        });
        expect(mockSetAutoEnablingEis).toHaveBeenCalledWith(false);
      });
    });
  });
});
