/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useConnectorSelection } from './use_connector_selection';

jest.mock('../use_kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('react-use/lib/useLocalStorage', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { useKibana } from '../use_kibana';
import { storageKeys } from '../../storage_keys';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseLocalStorage = useLocalStorage as jest.MockedFunction<typeof useLocalStorage>;

describe('useConnectorSelection', () => {
  let mockSettingsGet: jest.Mock;
  let localStorageState: { [key: string]: string | undefined };
  let mockSetLocalStorage: jest.Mock;

  beforeEach(() => {
    mockSettingsGet = jest.fn();
    localStorageState = {};
    mockSetLocalStorage = jest.fn((newValue: string) => {
      localStorageState[storageKeys.lastUsedConnector] = newValue;
    });

    // Mock localStorage
    mockUseLocalStorage.mockImplementation((key: string) => {
      const value = localStorageState[key];
      return [value, mockSetLocalStorage, jest.fn()];
    });

    // Mock Kibana services
    mockUseKibana.mockReturnValue({
      services: {
        settings: {
          client: {
            get: mockSettingsGet,
          },
        },
      },
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selectedConnector', () => {
    it('should return undefined when no connector is selected and no default is set', () => {
      mockSettingsGet.mockReturnValue(undefined);

      const { result } = renderHook(() => useConnectorSelection());

      expect(result.current.selectedConnector).toBeUndefined();
      expect(result.current.defaultConnectorId).toBeUndefined();
    });

    it('should return the connector from localStorage when set', () => {
      mockSettingsGet.mockReturnValue(undefined);
      localStorageState[storageKeys.lastUsedConnector] = 'connector-1';

      const { result } = renderHook(() => useConnectorSelection());

      expect(result.current.selectedConnector).toBe('connector-1');
    });

    it('should return defaultConnectorId from settings', () => {
      mockSettingsGet.mockReturnValue('default-connector');

      const { result } = renderHook(() => useConnectorSelection());

      expect(result.current.defaultConnectorId).toBe('default-connector');
    });
  });

  describe('selectConnector', () => {
    it('should update localStorage when a connector is selected', () => {
      mockSettingsGet.mockReturnValue(undefined);

      const { result } = renderHook(() => useConnectorSelection());

      act(() => {
        result.current.selectConnector('connector-2');
      });

      expect(mockSetLocalStorage).toHaveBeenCalledWith('connector-2');
      expect(localStorageState[storageKeys.lastUsedConnector]).toBe('connector-2');
    });

    it('should update selected connector when selectConnector is called', () => {
      mockSettingsGet.mockReturnValue(undefined);

      const { result, rerender } = renderHook(() => useConnectorSelection());

      act(() => {
        result.current.selectConnector('connector-3');
      });

      // Rerender to get updated value from localStorage
      rerender();

      expect(result.current.selectedConnector).toBe('connector-3');
    });

    it('should allow selecting different connectors sequentially', () => {
      mockSettingsGet.mockReturnValue(undefined);

      const { result, rerender } = renderHook(() => useConnectorSelection());

      act(() => {
        result.current.selectConnector('connector-1');
      });
      rerender();
      expect(result.current.selectedConnector).toBe('connector-1');

      act(() => {
        result.current.selectConnector('connector-2');
      });
      rerender();
      expect(result.current.selectedConnector).toBe('connector-2');

      act(() => {
        result.current.selectConnector('connector-3');
      });
      rerender();
      expect(result.current.selectedConnector).toBe('connector-3');
    });
  });

  describe('edge cases', () => {
    it('should handle settings being undefined gracefully', () => {
      mockUseKibana.mockReturnValue({
        services: {
          settings: undefined,
        },
      } as any);

      const { result } = renderHook(() => useConnectorSelection());

      expect(result.current.defaultConnectorId).toBeUndefined();
      expect(() => result.current.selectConnector('connector-1')).not.toThrow();
    });

    it('should maintain selection stability across re-renders', () => {
      mockSettingsGet.mockReturnValue('default-connector');
      localStorageState[storageKeys.lastUsedConnector] = 'connector-2';

      const { result, rerender } = renderHook(() => useConnectorSelection());

      const firstSelectedConnector = result.current.selectedConnector;
      const firstDefaultConnectorId = result.current.defaultConnectorId;

      rerender();
      rerender();
      rerender();

      expect(result.current.selectedConnector).toBe(firstSelectedConnector);
      expect(result.current.defaultConnectorId).toBe(firstDefaultConnectorId);
    });

    it('should update when default connector changes in settings', () => {
      mockSettingsGet.mockReturnValue('default-connector-1');

      const { result, rerender } = renderHook(() => useConnectorSelection());

      expect(result.current.defaultConnectorId).toBe('default-connector-1');

      mockSettingsGet.mockReturnValue('default-connector-2');
      rerender();

      expect(result.current.defaultConnectorId).toBe('default-connector-2');
    });
  });
});
