/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGenAIConnectors, type Connector } from './use_genai_connectors';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { IUiSettingsClient } from '@kbn/core/public';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

const STREAMS_CONNECTOR_STORAGE_KEY = 'xpack.streamsApp.lastUsedConnector';
const OLD_STORAGE_KEY = 'xpack.observabilityAiAssistant.lastUsedConnector';

const createMockConnector = (id: string, name: string): Connector => ({
  id,
  name,
  actionTypeId: '.gen-ai',
});

describe('useGenAIConnectors', () => {
  let mockStreamsRepositoryClient: jest.Mocked<StreamsRepositoryClient>;
  let mockUiSettings: jest.Mocked<IUiSettingsClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear localStorage
    localStorage.removeItem(STREAMS_CONNECTOR_STORAGE_KEY);
    localStorage.removeItem(OLD_STORAGE_KEY);

    mockStreamsRepositoryClient = {
      fetch: jest.fn(),
    } as unknown as jest.Mocked<StreamsRepositoryClient>;

    mockUiSettings = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return 'NO_DEFAULT_CONNECTOR';
        }
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) {
          return defaultValue ?? false;
        }
        return defaultValue;
      }),
    } as unknown as jest.Mocked<IUiSettingsClient>;
  });

  afterEach(() => {
    localStorage.removeItem(STREAMS_CONNECTOR_STORAGE_KEY);
    localStorage.removeItem(OLD_STORAGE_KEY);
  });

  describe('connector fallback behavior', () => {
    it('selects the first available connector when selected connector is no longer available', async () => {
      // Setup: user has a connector in localStorage that no longer exists
      localStorage.setItem(STREAMS_CONNECTOR_STORAGE_KEY, JSON.stringify('deleted-connector'));

      mockStreamsRepositoryClient.fetch.mockResolvedValue({
        connectors: [
          createMockConnector('connector-1', 'Connector 1'),
          createMockConnector('connector-2', 'Connector 2'),
        ],
      });

      const { result } = renderHook(() =>
        useGenAIConnectors({
          streamsRepositoryClient: mockStreamsRepositoryClient,
          uiSettings: mockUiSettings,
        })
      );

      // Wait for connectors to load and fallback to trigger
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.selectedConnector).toBe('connector-1');
      });
    });

    it('does not change connector when selected connector is still available', async () => {
      localStorage.setItem(STREAMS_CONNECTOR_STORAGE_KEY, JSON.stringify('connector-2'));

      mockStreamsRepositoryClient.fetch.mockResolvedValue({
        connectors: [
          createMockConnector('connector-1', 'Connector 1'),
          createMockConnector('connector-2', 'Connector 2'),
        ],
      });

      const { result } = renderHook(() =>
        useGenAIConnectors({
          streamsRepositoryClient: mockStreamsRepositoryClient,
          uiSettings: mockUiSettings,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.selectedConnector).toBe('connector-2');
    });

    it('falls back to first connector when default connector setting points to non-existent connector', async () => {
      // No localStorage value, but default connector doesn't exist
      mockUiSettings.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return 'non-existent-default';
        }
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) {
          return false;
        }
        return defaultValue;
      });

      mockStreamsRepositoryClient.fetch.mockResolvedValue({
        connectors: [
          createMockConnector('connector-1', 'Connector 1'),
          createMockConnector('connector-2', 'Connector 2'),
        ],
      });

      const { result } = renderHook(() =>
        useGenAIConnectors({
          streamsRepositoryClient: mockStreamsRepositoryClient,
          uiSettings: mockUiSettings,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.selectedConnector).toBe('connector-1');
      });
    });

    it('returns first connector as selectedConnector when no connector is explicitly selected', async () => {
      // No localStorage value, no default connector
      mockStreamsRepositoryClient.fetch.mockResolvedValue({
        connectors: [
          createMockConnector('connector-1', 'Connector 1'),
          createMockConnector('connector-2', 'Connector 2'),
        ],
      });

      const { result } = renderHook(() =>
        useGenAIConnectors({
          streamsRepositoryClient: mockStreamsRepositoryClient,
          uiSettings: mockUiSettings,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // The hook returns `selectedConnector || connectors?.[0]?.id`
      expect(result.current.selectedConnector).toBe('connector-1');
    });

    it('returns undefined selectedConnector when no connectors exist', async () => {
      // No localStorage value, no connectors available
      mockStreamsRepositoryClient.fetch.mockResolvedValue({
        connectors: [],
      });

      const { result } = renderHook(() =>
        useGenAIConnectors({
          streamsRepositoryClient: mockStreamsRepositoryClient,
          uiSettings: mockUiSettings,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.selectedConnector).toBeUndefined();
      expect(result.current.connectors).toEqual([]);
    });
  });

  describe('selectConnector', () => {
    it('updates the selected connector', async () => {
      mockStreamsRepositoryClient.fetch.mockResolvedValue({
        connectors: [
          createMockConnector('connector-1', 'Connector 1'),
          createMockConnector('connector-2', 'Connector 2'),
        ],
      });

      const { result } = renderHook(() =>
        useGenAIConnectors({
          streamsRepositoryClient: mockStreamsRepositoryClient,
          uiSettings: mockUiSettings,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.selectConnector('connector-2');
      });

      expect(result.current.selectedConnector).toBe('connector-2');
    });
  });

  describe('loading state', () => {
    it('starts with loading true', () => {
      mockStreamsRepositoryClient.fetch.mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() =>
        useGenAIConnectors({
          streamsRepositoryClient: mockStreamsRepositoryClient,
          uiSettings: mockUiSettings,
        })
      );

      expect(result.current.loading).toBe(true);
    });

    it('sets loading to false after fetch completes', async () => {
      mockStreamsRepositoryClient.fetch.mockResolvedValue({
        connectors: [createMockConnector('connector-1', 'Connector 1')],
      });

      const { result } = renderHook(() =>
        useGenAIConnectors({
          streamsRepositoryClient: mockStreamsRepositoryClient,
          uiSettings: mockUiSettings,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('sets error when fetch fails', async () => {
      const error = new Error('Failed to fetch connectors');
      mockStreamsRepositoryClient.fetch.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useGenAIConnectors({
          streamsRepositoryClient: mockStreamsRepositoryClient,
          uiSettings: mockUiSettings,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(error);
      expect(result.current.connectors).toBeUndefined();
    });
  });
});
