/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGenAIConnectors } from './use_genai_connectors';
import type { HttpSetup, IHttpFetchError } from '@kbn/core-http-browser';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { InferenceConnectorType } from '@kbn/inference-common';

jest.mock('@kbn/inference-connectors', () => {
  const actual = jest.requireActual('@kbn/inference-connectors');
  return {
    ...actual,
    useLoadConnectors: jest.fn(),
  };
});

import { useLoadConnectors } from '@kbn/inference-connectors';

const mockUseLoadConnectors = useLoadConnectors as jest.MockedFunction<typeof useLoadConnectors>;

const STREAMS_CONNECTOR_STORAGE_KEY = 'xpack.streamsApp.lastUsedConnector';
const OLD_STORAGE_KEY = 'xpack.observabilityAiAssistant.lastUsedConnector';

const createMockAIConnector = (id: string, name: string) => ({
  id,
  name,
  actionTypeId: InferenceConnectorType.OpenAI,
  config: {},
  secrets: {},
  isPreconfigured: false,
  isSystemAction: false,
  isDeprecated: false,
  isConnectorTypeDeprecated: false,
  isMissingSecrets: false,
});

const createLoadConnectorsResult = (
  connectors: ReturnType<typeof createMockAIConnector>[],
  overrides: Partial<ReturnType<typeof useLoadConnectors>> = {}
) =>
  ({
    data: connectors,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    soEntryFound: false,
    ...overrides,
  } as unknown as ReturnType<typeof useLoadConnectors>);

describe('useGenAIConnectors', () => {
  const mockHttp = {} as HttpSetup;
  const mockSettings = {} as SettingsStart;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.removeItem(STREAMS_CONNECTOR_STORAGE_KEY);
    localStorage.removeItem(OLD_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(STREAMS_CONNECTOR_STORAGE_KEY);
    localStorage.removeItem(OLD_STORAGE_KEY);
  });

  describe('connector fallback behavior', () => {
    it('selects the first available connector when selected connector is no longer available', async () => {
      localStorage.setItem(STREAMS_CONNECTOR_STORAGE_KEY, JSON.stringify('deleted-connector'));

      mockUseLoadConnectors.mockReturnValue(
        createLoadConnectorsResult([
          createMockAIConnector('connector-1', 'Connector 1'),
          createMockAIConnector('connector-2', 'Connector 2'),
        ])
      );

      const { result } = renderHook(() =>
        useGenAIConnectors({ http: mockHttp, settings: mockSettings })
      );

      await waitFor(() => {
        expect(result.current.selectedConnector).toBe('connector-1');
      });
    });

    it('does not change connector when selected connector is still available', () => {
      localStorage.setItem(STREAMS_CONNECTOR_STORAGE_KEY, JSON.stringify('connector-2'));

      mockUseLoadConnectors.mockReturnValue(
        createLoadConnectorsResult([
          createMockAIConnector('connector-1', 'Connector 1'),
          createMockAIConnector('connector-2', 'Connector 2'),
        ])
      );

      const { result } = renderHook(() =>
        useGenAIConnectors({ http: mockHttp, settings: mockSettings })
      );

      expect(result.current.selectedConnector).toBe('connector-2');
    });

    it('returns first connector as selectedConnector when no connector is explicitly selected', () => {
      mockUseLoadConnectors.mockReturnValue(
        createLoadConnectorsResult([
          createMockAIConnector('connector-1', 'Connector 1'),
          createMockAIConnector('connector-2', 'Connector 2'),
        ])
      );

      const { result } = renderHook(() =>
        useGenAIConnectors({ http: mockHttp, settings: mockSettings })
      );

      expect(result.current.selectedConnector).toBe('connector-1');
    });

    it('returns undefined selectedConnector when no connectors exist', () => {
      mockUseLoadConnectors.mockReturnValue(createLoadConnectorsResult([]));

      const { result } = renderHook(() =>
        useGenAIConnectors({ http: mockHttp, settings: mockSettings })
      );

      expect(result.current.selectedConnector).toBeUndefined();
      expect(result.current.connectors).toEqual([]);
    });
  });

  describe('selectConnector', () => {
    it('updates the selected connector', () => {
      mockUseLoadConnectors.mockReturnValue(
        createLoadConnectorsResult([
          createMockAIConnector('connector-1', 'Connector 1'),
          createMockAIConnector('connector-2', 'Connector 2'),
        ])
      );

      const { result } = renderHook(() =>
        useGenAIConnectors({ http: mockHttp, settings: mockSettings })
      );

      act(() => {
        result.current.selectConnector('connector-2');
      });

      expect(result.current.selectedConnector).toBe('connector-2');
    });
  });

  describe('loading state', () => {
    it('reports loading when useLoadConnectors is loading', () => {
      mockUseLoadConnectors.mockReturnValue(
        createLoadConnectorsResult([], { isLoading: true, data: undefined })
      );

      const { result } = renderHook(() =>
        useGenAIConnectors({ http: mockHttp, settings: mockSettings })
      );

      expect(result.current.loading).toBe(true);
    });

    it('reports not loading when useLoadConnectors finishes', () => {
      mockUseLoadConnectors.mockReturnValue(
        createLoadConnectorsResult([createMockAIConnector('connector-1', 'Connector 1')])
      );

      const { result } = renderHook(() =>
        useGenAIConnectors({ http: mockHttp, settings: mockSettings })
      );

      expect(result.current.loading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('exposes the error from useLoadConnectors', () => {
      const error = new Error('Failed to fetch connectors') as unknown as IHttpFetchError;
      mockUseLoadConnectors.mockReturnValue(
        createLoadConnectorsResult([], { error, data: undefined })
      );

      const { result } = renderHook(() =>
        useGenAIConnectors({ http: mockHttp, settings: mockSettings })
      );

      expect(result.current.error).toBe(error);
      expect(result.current.connectors).toBeUndefined();
    });
  });

  describe('connector mapping', () => {
    it('maps AIConnector to InferenceConnector shape', () => {
      mockUseLoadConnectors.mockReturnValue(
        createLoadConnectorsResult([createMockAIConnector('c-1', 'My Connector')])
      );

      const { result } = renderHook(() =>
        useGenAIConnectors({ http: mockHttp, settings: mockSettings })
      );

      expect(result.current.connectors).toEqual([
        expect.objectContaining({
          connectorId: 'c-1',
          name: 'My Connector',
          type: InferenceConnectorType.OpenAI,
        }),
      ]);
    });
  });
});
