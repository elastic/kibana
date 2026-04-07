/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useGenAIConnectorsWithoutContext } from './use_genai_connectors';
import type { AIConnector } from '@kbn/inference-connectors';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { ObservabilityAIAssistantService } from '../types';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

const mockUseLoadConnectors = jest.fn();
jest.mock('@kbn/inference-connectors', () => ({
  useLoadConnectors: (...args: unknown[]) => mockUseLoadConnectors(...args),
}));

jest.mock('@kbn/inference-common', () => ({
  connectorToInference: (c: { id: string; name: string; actionTypeId: string }) => ({
    connectorId: c.id,
    name: c.name,
    type: c.actionTypeId,
  }),
}));

jest.mock('react-use/lib/useLocalStorage', () => jest.fn());

const mockUiSettingsGet = jest.fn();
jest.mock('./use_kibana', () => {
  const http = {};
  const settings = {};
  const notifications = { toasts: {} };
  return {
    useKibana: () => ({
      services: {
        uiSettings: { get: (...args: unknown[]) => mockUiSettingsGet(...args) },
        http,
        settings,
        notifications,
      },
    }),
  };
});
jest.mock('../../common/utils/get_inference_connector', () => ({
  getInferenceConnectorInfo: jest.fn((connector) => connector),
}));

const mockAIConnectors: AIConnector[] = [
  {
    id: 'connector-1',
    name: 'Connector 1',
    actionTypeId: '.gen-ai',
    config: {},
    secrets: {},
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    isMissingSecrets: false,
  },
  {
    id: 'connector-2',
    name: 'Connector 2',
    actionTypeId: '.bedrock',
    config: {},
    secrets: {},
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    isMissingSecrets: false,
  },
  {
    id: 'elastic-llm',
    name: 'Elastic LLM',
    actionTypeId: '.inference',
    config: { inferenceId: 'inf-1' },
    secrets: {},
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    isMissingSecrets: false,
    isEis: true,
  },
];

const mockRefetch = jest.fn();

const mockAssistant: Partial<ObservabilityAIAssistantService> = {
  callApi: jest.fn(),
};

function renderUseGenAIHook() {
  return renderHook(() =>
    useGenAIConnectorsWithoutContext(mockAssistant as ObservabilityAIAssistantService)
  );
}

describe('useGenAIConnectorsWithoutContext', () => {
  beforeAll(() => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['', jest.fn()]);
  });
  beforeEach(() => {
    mockUseLoadConnectors.mockReturnValue({
      data: mockAIConnectors,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUiSettingsGet.mockReset();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls useLoadConnectors with correct featureId', () => {
    renderUseGenAIHook();

    expect(mockUseLoadConnectors).toHaveBeenCalledWith(
      expect.objectContaining({
        featureId: 'observability_ai_assistant_inference_subfeature',
      })
    );
  });

  it('loads connectors and sets loading state', () => {
    const { result } = renderUseGenAIHook();
    expect(result.current.connectors).toHaveLength(3);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('return first connector as selectedConnector when no default or last used is set', () => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['', jest.fn()]);
    const { result } = renderUseGenAIHook();
    expect(result.current.selectedConnector).toBe('connector-1');
  });

  it('return defaultConnector if isConnectorSelectionRestricted is true', () => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['', jest.fn()]);
    mockUiSettingsGet.mockImplementation((key: string, fallback?: any) => {
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return 'connector-2';
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return true;
      return fallback;
    });
    const { result } = renderUseGenAIHook();

    expect(result.current.selectedConnector).toBe('connector-2');
  });

  it('return selectedConnector from localStorage if exists', () => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['connector-1', jest.fn()]);
    mockUiSettingsGet.mockImplementation((key: string, fallback?: any) => {
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return 'connector-2';
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return false;
      return fallback;
    });
    const { result } = renderUseGenAIHook();
    expect(result.current.selectedConnector).toBe('connector-1');
  });

  it('return defaultConnector if no localStorage entry exists', () => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['', jest.fn()]);
    mockUiSettingsGet.mockImplementation((key: string, fallback?: any) => {
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return 'connector-2';
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return false;
      return fallback;
    });
    const { result } = renderUseGenAIHook();
    expect(result.current.selectedConnector).toBe('connector-2');
  });

  it('handles API error', async () => {
    const error = new Error('API failed');
    mockUseLoadConnectors.mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
      refetch: mockRefetch,
    });
    const { result } = renderUseGenAIHook();

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.connectors).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });

});
