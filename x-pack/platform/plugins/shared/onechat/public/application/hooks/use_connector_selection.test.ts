/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useConnectorSelection } from './use_connector_selection';
import { InferenceConnectorType, type InferenceConnector } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('./use_toasts', () => ({
  useToasts: jest.fn(() => ({
    addErrorToast: jest.fn(),
    addSuccessToast: jest.fn(),
  })),
}));

import { useKibana } from './use_kibana';
import { storageKeys } from '../storage_keys';

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useConnectorSelection', () => {
  let mockGetConnectors: jest.Mock;
  let mockUiSettingsGet: jest.Mock;
  let mockConnectors: InferenceConnector[];

  beforeEach(() => {
    mockConnectors = [
      {
        connectorId: 'connector-1',
        name: 'Connector 1',
        type: InferenceConnectorType.OpenAI,
      } as InferenceConnector,
      {
        connectorId: 'connector-2',
        name: 'Connector 2',
        type: InferenceConnectorType.Bedrock,
      } as InferenceConnector,
      {
        connectorId: 'connector-3',
        name: 'Connector 3',
        type: InferenceConnectorType.Gemini,
      } as InferenceConnector,
    ];

    mockGetConnectors = jest.fn().mockResolvedValue(mockConnectors);
    mockUiSettingsGet = jest.fn();

    mockUseKibana.mockReturnValue({
      services: {
        plugins: {
          inference: {
            getConnectors: mockGetConnectors,
          },
        },
        uiSettings: {
          get: mockUiSettingsGet,
        },
      },
    } as any);

    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('initial loading', () => {
    it('should load connectors on mount', async () => {
      const { result } = renderHook(() => useConnectorSelection());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetConnectors).toHaveBeenCalledTimes(1);
      expect(result.current.connectors).toEqual(mockConnectors);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when loading connectors', async () => {
      const error = new Error('Failed to load connectors');
      mockGetConnectors.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.connectors).toEqual([]);
    });

    it('should not call getConnectors if inference is not available', async () => {
      mockUseKibana.mockReturnValue({
        services: {
          plugins: {},
          uiSettings: {
            get: mockUiSettingsGet,
          },
        },
      } as any);

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetConnectors).not.toHaveBeenCalled();
    });
  });

  describe('connector selection priority', () => {
    it('should select the first available connector when no preferences are set', async () => {
      mockUiSettingsGet.mockReturnValue(NO_DEFAULT_CONNECTOR);

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.selectedConnector).toBe('connector-1');
    });

    it('should use default connector when set', async () => {
      mockUiSettingsGet.mockImplementation((key: string) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return 'connector-2';
        }
        return false;
      });

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.selectedConnector).toBe('connector-2');
      expect(result.current.defaultConnector).toBe('connector-2');
    });

    it('should prefer localStorage over default connector', async () => {
      mockUiSettingsGet.mockImplementation((key: string) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return 'connector-2';
        }
        return false;
      });

      localStorage.setItem(storageKeys.lastUsedConnector, 'connector-3');

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.selectedConnector).toBe('connector-3');
    });

    it('should prefer user selection over localStorage', async () => {
      mockUiSettingsGet.mockImplementation((key: string) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return 'connector-1';
        }
        return false;
      });

      localStorage.setItem(storageKeys.lastUsedConnector, 'connector-2');

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectConnector('connector-3');
      });

      expect(result.current.selectedConnector).toBe('connector-3');
    });

    it('should ignore invalid connector in localStorage', async () => {
      mockUiSettingsGet.mockImplementation((key: string) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return 'connector-2';
        }
        return false;
      });

      localStorage.setItem(storageKeys.lastUsedConnector, 'non-existent-connector');

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.selectedConnector).toBe('connector-2');
    });

    it('should fallback to first connector when stored connector becomes unavailable', async () => {
      mockUiSettingsGet.mockReturnValue(NO_DEFAULT_CONNECTOR);

      localStorage.setItem(storageKeys.lastUsedConnector, 'removed-connector');

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.selectedConnector).toBe('connector-1');
    });
  });

  describe('admin restrictions', () => {
    it('should filter to only show default connector when defaultConnectorOnly is true', async () => {
      mockUiSettingsGet.mockImplementation((key: string) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return 'connector-2';
        }
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) {
          return true;
        }
        return false;
      });

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.connectors).toEqual([
        {
          connectorId: 'connector-2',
          name: 'Connector 2',
          type: InferenceConnectorType.Bedrock,
        },
      ]);
      expect(result.current.selectedConnector).toBe('connector-2');
    });

    it('should always use default connector when selection is restricted', async () => {
      mockUiSettingsGet.mockImplementation((key: string) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return 'connector-2';
        }
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) {
          return true;
        }
        return false;
      });

      localStorage.setItem(storageKeys.lastUsedConnector, 'connector-3');

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.selectedConnector).toBe('connector-2');

      act(() => {
        result.current.selectConnector('connector-3');
      });

      expect(result.current.selectedConnector).toBe('connector-2');
    });

    it('should not restrict when defaultConnectorOnly is true but default is NO_DEFAULT_CONNECTOR', async () => {
      mockUiSettingsGet.mockImplementation((key: string) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return NO_DEFAULT_CONNECTOR;
        }
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) {
          return true;
        }
        return false;
      });

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.connectors).toEqual(mockConnectors);
      expect(result.current.selectedConnector).toBe('connector-1');
    });

    it('should not save to localStorage when selection is restricted', async () => {
      mockUiSettingsGet.mockImplementation((key: string) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return 'connector-2';
        }
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) {
          return true;
        }
        return false;
      });

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectConnector('connector-3');
      });

      expect(localStorage.getItem(storageKeys.lastUsedConnector)).toBeNull();
    });
  });

  describe('selectConnector', () => {
    it('should update selected connector and save to localStorage', async () => {
      mockUiSettingsGet.mockReturnValue(NO_DEFAULT_CONNECTOR);

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectConnector('connector-2');
      });

      expect(result.current.selectedConnector).toBe('connector-2');
      expect(localStorage.getItem(storageKeys.lastUsedConnector)).toBe('connector-2');
    });

    it('should handle localStorage read errors gracefully', async () => {
      mockUiSettingsGet.mockReturnValue(NO_DEFAULT_CONNECTOR);

      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('Storage access denied');
      });

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.selectedConnector).toBe('connector-1');

      localStorage.getItem = originalGetItem;
    });
  });

  describe('reloadConnectors', () => {
    it('should reload connectors when called', async () => {
      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetConnectors).toHaveBeenCalledTimes(1);

      const newConnectors = [
        {
          connectorId: 'connector-4',
          name: 'Connector 4',
          type: InferenceConnectorType.Inference,
        } as InferenceConnector,
      ];
      mockGetConnectors.mockResolvedValueOnce(newConnectors);

      await act(async () => {
        result.current.reloadConnectors();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetConnectors).toHaveBeenCalledTimes(2);
      expect(result.current.connectors).toEqual(newConnectors);
    });

    it('should update selected connector if current selection becomes unavailable after reload', async () => {
      mockUiSettingsGet.mockReturnValue(NO_DEFAULT_CONNECTOR);

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectConnector('connector-2');
      });

      expect(result.current.selectedConnector).toBe('connector-2');

      const newConnectors = [
        {
          connectorId: 'connector-4',
          name: 'Connector 4',
          type: InferenceConnectorType.Inference,
        } as InferenceConnector,
      ];
      mockGetConnectors.mockResolvedValueOnce(newConnectors);

      await act(async () => {
        result.current.reloadConnectors();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.selectedConnector).toBe('connector-4');
    });
  });

  describe('edge cases', () => {
    it('should handle empty connector list', async () => {
      mockGetConnectors.mockResolvedValueOnce([]);
      mockUiSettingsGet.mockReturnValue(NO_DEFAULT_CONNECTOR);

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.connectors).toEqual([]);
      expect(result.current.selectedConnector).toBeUndefined();
    });

    it('should handle uiSettings being undefined', async () => {
      mockUseKibana.mockReturnValue({
        services: {
          plugins: {
            inference: {
              getConnectors: mockGetConnectors,
            },
          },
          uiSettings: undefined,
        },
      } as any);

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.selectedConnector).toBe('connector-1');
      expect(result.current.defaultConnector).toBeUndefined();
    });

    it('should maintain selection stability across re-renders', async () => {
      mockUiSettingsGet.mockReturnValue(NO_DEFAULT_CONNECTOR);
      localStorage.setItem(storageKeys.lastUsedConnector, 'connector-2');

      const { result, rerender } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstSelectedConnector = result.current.selectedConnector;
      expect(firstSelectedConnector).toBe('connector-2');

      rerender();

      expect(result.current.selectedConnector).toBe(firstSelectedConnector);
    });

    it('should handle race conditions when selecting connectors rapidly', async () => {
      mockUiSettingsGet.mockReturnValue(NO_DEFAULT_CONNECTOR);

      const { result } = renderHook(() => useConnectorSelection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectConnector('connector-1');
        result.current.selectConnector('connector-2');
        result.current.selectConnector('connector-3');
      });

      expect(result.current.selectedConnector).toBe('connector-3');
      expect(localStorage.getItem(storageKeys.lastUsedConnector)).toBe('connector-3');
    });
  });
});
