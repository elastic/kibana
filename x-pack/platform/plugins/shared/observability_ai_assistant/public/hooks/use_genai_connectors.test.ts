/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useGenAIConnectorsWithoutContext } from './use_genai_connectors';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { AIConnector } from '@kbn/inference-connectors';
import { useLoadConnectors } from '@kbn/inference-connectors';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

jest.mock('react-use/lib/useLocalStorage', () => jest.fn());

const mockSettingsGet = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {},
      notifications: { toasts: {} },
      settings: { client: { get: mockSettingsGet } },
    },
  }),
}));
jest.mock('../../common/utils/get_inference_connector', () => ({
  getInferenceConnectorInfo: jest.fn((connector) => connector),
}));

const mockRefetch = jest.fn();
jest.mock('@kbn/inference-connectors', () => ({
  useLoadConnectors: jest.fn(),
}));
const mockUseLoadConnectors = useLoadConnectors as jest.Mock;

const mockAIConnectors: AIConnector[] = [
  {
    id: 'connector-1',
    name: 'Connector 1',
    actionTypeId: '.gen-ai',
    config: {},
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    isSystemAction: false,
    isMissingSecrets: false,
  },
  {
    id: 'connector-2',
    name: 'Connector 2',
    actionTypeId: '.gen-ai',
    config: {},
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    isSystemAction: false,
    isMissingSecrets: false,
  },
  {
    id: 'elastic-llm',
    name: 'Elastic LLM',
    actionTypeId: '.inference',
    config: { inferenceId: 'inf-1' },
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    isSystemAction: false,
    isMissingSecrets: false,
    isEis: true,
  },
];

function renderUseGenAIHook() {
  return renderHook(() => useGenAIConnectorsWithoutContext());
}

describe('useGenAIConnectorsWithoutContext', () => {
  beforeAll(() => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['', jest.fn()]);
  });
  beforeEach(() => {
    mockSettingsGet.mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return '';
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return false;
      return defaultValue;
    });
    mockUseLoadConnectors.mockReturnValue({
      data: mockAIConnectors,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      soEntryFound: false,
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads connectors and maps them to InferenceConnector shape', () => {
    const { result } = renderUseGenAIHook();
    expect(result.current.loading).toBe(false);
    expect(result.current.connectors).toHaveLength(3);
    expect(result.current.connectors![0].connectorId).toBe('connector-1');
    expect(result.current.connectors![2].connectorId).toBe('elastic-llm');
    expect(result.current.connectors![2].isEis).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('returns first connector as selectedConnector when no last used is set', () => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['', jest.fn()]);
    const { result } = renderUseGenAIHook();
    expect(result.current.selectedConnector).toBe('connector-1');
  });

  it('returns selectedConnector from localStorage if exists', () => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['connector-1', jest.fn()]);
    const { result } = renderUseGenAIHook();
    expect(result.current.selectedConnector).toBe('connector-1');
  });

  it('handles API error', async () => {
    const error = new Error('API failed');
    mockUseLoadConnectors.mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
      refetch: mockRefetch,
      soEntryFound: false,
    });
    const { result } = renderUseGenAIHook();

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });

    expect(result.current.connectors).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });

  it('passes the feature ID to useLoadConnectors', () => {
    renderUseGenAIHook();
    expect(mockUseLoadConnectors).toHaveBeenCalledWith(
      expect.objectContaining({
        featureId: 'observability_ai_assistant_inference_subfeature',
      })
    );
  });

  it('falls back to first connector when localStorage has a stale connector ID', () => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['stale-id', jest.fn()]);
    const { result } = renderUseGenAIHook();
    expect(result.current.selectedConnector).toBe('connector-1');
  });

  describe('default connector settings', () => {
    it('restricts selection when admin sets default-only with a single connector returned', () => {
      mockSettingsGet.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return 'connector-2';
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return true;
        return defaultValue;
      });
      mockUseLoadConnectors.mockReturnValue({
        data: [mockAIConnectors[1]],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        soEntryFound: false,
      });

      const { result } = renderUseGenAIHook();

      expect(result.current.isConnectorSelectionRestricted).toBe(true);
      expect(result.current.defaultConnector).toBe('connector-2');
      expect(result.current.selectedConnector).toBe('connector-2');
      expect(result.current.connectors).toHaveLength(1);
    });

    it('selects default connector first when no localStorage is set', () => {
      (useLocalStorage as jest.Mock).mockImplementation(() => ['', jest.fn()]);
      mockSettingsGet.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return 'connector-2';
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return false;
        return defaultValue;
      });

      const { result } = renderUseGenAIHook();

      expect(result.current.isConnectorSelectionRestricted).toBe(false);
      expect(result.current.defaultConnector).toBe('connector-2');
      expect(result.current.selectedConnector).toBe('connector-2');
    });

    it('ignores localStorage when admin restricts to default connector only', () => {
      (useLocalStorage as jest.Mock).mockImplementation(() => ['connector-1', jest.fn()]);
      mockSettingsGet.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return 'connector-2';
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return true;
        return defaultValue;
      });
      mockUseLoadConnectors.mockReturnValue({
        data: [mockAIConnectors[1]],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        soEntryFound: false,
      });

      const { result } = renderUseGenAIHook();

      expect(result.current.isConnectorSelectionRestricted).toBe(true);
      expect(result.current.selectedConnector).toBe('connector-2');
    });

    it('returns empty connector list when admin restricts but no default is configured', () => {
      mockSettingsGet.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return '';
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return true;
        return defaultValue;
      });
      mockUseLoadConnectors.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        soEntryFound: false,
      });

      const { result } = renderUseGenAIHook();

      expect(result.current.isConnectorSelectionRestricted).toBe(false);
      expect(result.current.connectors).toHaveLength(0);
      expect(result.current.selectedConnector).toBeUndefined();
      expect(result.current.defaultConnector).toBeUndefined();
    });
  });
});
