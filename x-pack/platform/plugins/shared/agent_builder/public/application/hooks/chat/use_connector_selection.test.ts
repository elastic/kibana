/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
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

import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

describe('useConnectorSelection', () => {
  let defaultConnector$: BehaviorSubject<string | undefined>;
  let defaultConnectorOnly$: BehaviorSubject<boolean>;
  let localStorageState: { [key: string]: string | undefined };
  let mockSetLocalStorage: jest.Mock;

  const buildGet$ = () =>
    jest.fn((key: string) => {
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return defaultConnector$;
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return defaultConnectorOnly$;
      return new BehaviorSubject(undefined);
    });

  beforeEach(() => {
    defaultConnector$ = new BehaviorSubject<string | undefined>(undefined);
    defaultConnectorOnly$ = new BehaviorSubject<boolean>(false);
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
            get$: buildGet$(),
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
      const { result } = renderHook(() => useConnectorSelection());

      expect(result.current.selectedConnector).toBeUndefined();
      expect(result.current.defaultConnectorId).toBeUndefined();
    });

    it('should return the connector from localStorage when set', () => {
      localStorageState[storageKeys.lastUsedConnector] = 'connector-1';

      const { result } = renderHook(() => useConnectorSelection());

      expect(result.current.selectedConnector).toBe('connector-1');
    });

    it('should return defaultConnectorId from settings', () => {
      defaultConnector$ = new BehaviorSubject<string | undefined>('default-connector');
      mockUseKibana.mockReturnValue({
        services: {
          settings: {
            client: {
              get$: buildGet$(),
            },
          },
        },
      } as any);

      const { result } = renderHook(() => useConnectorSelection());

      expect(result.current.defaultConnectorId).toBe('default-connector');
    });
  });

  describe('defaultConnectorOnly', () => {
    it('defaults to false when settings is undefined', () => {
      mockUseKibana.mockReturnValue({
        services: {
          settings: undefined,
        },
      } as any);

      const { result } = renderHook(() => useConnectorSelection());

      expect(result.current.defaultConnectorOnly).toBe(false);
    });

    it('reads the current value of the defaultConnectorOnly setting', () => {
      defaultConnectorOnly$ = new BehaviorSubject<boolean>(true);
      mockUseKibana.mockReturnValue({
        services: {
          settings: {
            client: {
              get$: buildGet$(),
            },
          },
        },
      } as any);

      const { result } = renderHook(() => useConnectorSelection());

      expect(result.current.defaultConnectorOnly).toBe(true);
    });

    it('reactively updates when the defaultConnectorOnly setting changes', () => {
      const { result } = renderHook(() => useConnectorSelection());

      expect(result.current.defaultConnectorOnly).toBe(false);

      act(() => {
        defaultConnectorOnly$.next(true);
      });

      expect(result.current.defaultConnectorOnly).toBe(true);

      act(() => {
        defaultConnectorOnly$.next(false);
      });

      expect(result.current.defaultConnectorOnly).toBe(false);
    });
  });

  describe('selectConnector', () => {
    it('should update localStorage when a connector is selected', () => {
      const { result } = renderHook(() => useConnectorSelection());

      act(() => {
        result.current.selectConnector('connector-2');
      });

      expect(mockSetLocalStorage).toHaveBeenCalledWith('connector-2');
      expect(localStorageState[storageKeys.lastUsedConnector]).toBe('connector-2');
    });

    it('should update selected connector when selectConnector is called', () => {
      const { result, rerender } = renderHook(() => useConnectorSelection());

      act(() => {
        result.current.selectConnector('connector-3');
      });

      // Rerender to get updated value from localStorage
      rerender();

      expect(result.current.selectedConnector).toBe('connector-3');
    });

    it('should allow selecting different connectors sequentially', () => {
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
      defaultConnector$ = new BehaviorSubject<string | undefined>('default-connector');
      mockUseKibana.mockReturnValue({
        services: {
          settings: {
            client: {
              get$: buildGet$(),
            },
          },
        },
      } as any);
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
      defaultConnector$ = new BehaviorSubject<string | undefined>('default-connector-1');
      mockUseKibana.mockReturnValue({
        services: {
          settings: {
            client: {
              get$: buildGet$(),
            },
          },
        },
      } as any);

      const { result } = renderHook(() => useConnectorSelection());

      expect(result.current.defaultConnectorId).toBe('default-connector-1');

      act(() => {
        defaultConnector$.next('default-connector-2');
      });

      expect(result.current.defaultConnectorId).toBe('default-connector-2');
    });
  });
});
