/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useServiceActions } from './use_service_actions';
import { useCloudConnectedAppContext } from '../../../app_context';
import type { CloudService } from '../../../../types';

jest.mock('../../../app_context');

describe('useServiceActions', () => {
  const mockNotifications = {
    toasts: {
      addDanger: jest.fn(),
      addWarning: jest.fn(),
      addSuccess: jest.fn(),
    },
  };

  const mockTelemetryService = {
    trackServiceEnabled: jest.fn(),
    trackServiceDisabled: jest.fn(),
    trackLinkClicked: jest.fn(),
  };

  const mockApiService = {
    updateServices: jest.fn(),
  };

  const mockSetHasAnyDefaultLLMConnectors = jest.fn();

  const mockServices: { auto_ops?: CloudService; eis?: CloudService } = {
    eis: {
      enabled: false,
      config: { region_id: 'us-east-1' },
    },
  };

  const mockOnServiceUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCloudConnectedAppContext as jest.Mock).mockReturnValue({
      notifications: mockNotifications,
      telemetryService: mockTelemetryService,
      apiService: mockApiService,
      hasActionsSavePrivilege: true,
      setHasAnyDefaultLLMConnectors: mockSetHasAnyDefaultLLMConnectors,
    });
  });

  describe('handleEnableService', () => {
    it('calls setHasAnyDefaultLLMConnectors(true) when EIS is enabled and user has hasActionsSavePrivilege', async () => {
      mockApiService.updateServices.mockResolvedValue({ data: {}, error: null });

      const { result } = renderHook(() =>
        useServiceActions({
          onServiceUpdate: mockOnServiceUpdate,
          services: mockServices,
        })
      );

      await act(async () => {
        await result.current.handleEnableService('eis');
      });

      expect(mockSetHasAnyDefaultLLMConnectors).toHaveBeenCalledWith(true);
      expect(mockTelemetryService.trackServiceEnabled).toHaveBeenCalledWith({
        service_type: 'eis',
        region_id: 'us-east-1',
      });
    });

    it('does NOT call setHasAnyDefaultLLMConnectors when EIS is disabled', async () => {
      mockApiService.updateServices.mockResolvedValue({ data: {}, error: null });

      const { result } = renderHook(() =>
        useServiceActions({
          onServiceUpdate: mockOnServiceUpdate,
          services: mockServices,
        })
      );

      // Simulate disabling EIS via the modal flow
      act(() => {
        result.current.showDisableModal('eis', 'EIS');
      });

      await act(async () => {
        await result.current.handleDisableService();
      });

      expect(mockSetHasAnyDefaultLLMConnectors).not.toHaveBeenCalled();
      expect(mockTelemetryService.trackServiceDisabled).toHaveBeenCalled();
    });

    it('does NOT call setHasAnyDefaultLLMConnectors when user lacks hasActionsSavePrivilege', async () => {
      (useCloudConnectedAppContext as jest.Mock).mockReturnValue({
        notifications: mockNotifications,
        telemetryService: mockTelemetryService,
        apiService: mockApiService,
        hasActionsSavePrivilege: false,
        setHasAnyDefaultLLMConnectors: mockSetHasAnyDefaultLLMConnectors,
      });

      mockApiService.updateServices.mockResolvedValue({ data: {}, error: null });

      const { result } = renderHook(() =>
        useServiceActions({
          onServiceUpdate: mockOnServiceUpdate,
          services: mockServices,
        })
      );

      await act(async () => {
        await result.current.handleEnableService('eis');
      });

      expect(mockSetHasAnyDefaultLLMConnectors).not.toHaveBeenCalled();
    });
  });

  describe('handleEnableServiceByUrl', () => {
    it('tracks telemetry and opens URL in new tab', () => {
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

      const { result } = renderHook(() =>
        useServiceActions({
          onServiceUpdate: mockOnServiceUpdate,
          services: mockServices,
        })
      );

      act(() => {
        result.current.handleEnableServiceByUrl('eis', 'https://example.com/enable');
      });

      expect(mockTelemetryService.trackLinkClicked).toHaveBeenCalledWith({
        destination_type: 'service_enable_url',
        service_type: 'eis',
      });
      expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com/enable', '_blank');

      windowOpenSpy.mockRestore();
    });
  });

  describe('disable modal management', () => {
    it('shows and closes disable modal correctly', () => {
      const { result } = renderHook(() =>
        useServiceActions({
          onServiceUpdate: mockOnServiceUpdate,
          services: mockServices,
        })
      );

      expect(result.current.disableModalService).toBeNull();

      act(() => {
        result.current.showDisableModal('eis', 'EIS Service');
      });

      expect(result.current.disableModalService).toEqual({
        key: 'eis',
        name: 'EIS Service',
      });

      act(() => {
        result.current.closeDisableModal();
      });

      expect(result.current.disableModalService).toBeNull();
    });
  });

  describe('loading state', () => {
    it('sets loading state during service update', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockApiService.updateServices.mockReturnValue(pendingPromise);

      const { result } = renderHook(() =>
        useServiceActions({
          onServiceUpdate: mockOnServiceUpdate,
          services: mockServices,
        })
      );

      expect(result.current.loadingService).toBeNull();

      act(() => {
        result.current.handleEnableService('eis');
      });

      expect(result.current.loadingService).toBe('eis');

      await act(async () => {
        resolvePromise!({ data: {}, error: null });
      });

      expect(result.current.loadingService).toBeNull();
    });
  });
});
