/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useGenAIConnectorsWithoutContext } from './use_genai_connectors';
import type { FindActionResult } from '@kbn/actions-plugin/server';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { ObservabilityAIAssistantService } from '../types';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

// Mock dependencies and data
jest.mock('react-use/lib/useLocalStorage', () => jest.fn());
const mockUiSettingsGet = jest.fn();
jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      uiSettings: {
        get: mockUiSettingsGet,
      },
    },
  }),
}));
jest.mock('../../common/utils/get_inference_connector', () => ({
  getInferenceConnectorInfo: jest.fn((connector) => connector),
}));
const mockConnectors: FindActionResult[] = [
  {
    id: 'connector-1',
    name: 'Connector 1',
    actionTypeId: '.gen-ai',
    config: {},
    referencedByCount: 0,
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
  },
  {
    id: 'connector-2',
    name: 'Connector 2',
    actionTypeId: '.gen-ai',
    config: {},
    referencedByCount: 0,
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
  },
  {
    id: 'elastic-llm',
    name: 'Elastic LLM',
    actionTypeId: '.inference',
    config: { inferenceId: 'inf-1' },
    referencedByCount: 0,
    isPreconfigured: true,
    isDeprecated: false,
    isSystemAction: false,
  },
];

const mockAssistant: Partial<ObservabilityAIAssistantService> = {
  callApi: jest.fn(),
};

function renderUseGenAIHook() {
  return renderHook(() =>
    useGenAIConnectorsWithoutContext(mockAssistant as ObservabilityAIAssistantService)
  );
}

async function waitForLoaded(result: ReturnType<typeof renderUseGenAIHook>['result']) {
  await waitFor(() => expect(result.current.loading).toBe(false));
}

describe('useGenAIConnectorsWithoutContext', () => {
  beforeAll(() => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['', jest.fn()]);
  });
  beforeEach(() => {
    (mockAssistant.callApi as jest.Mock).mockResolvedValue(mockConnectors);
    mockUiSettingsGet.mockReset();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads connectors and sets loading state', async () => {
    const { result } = renderUseGenAIHook();
    expect(result.current.loading).toBe(true);
    await waitForLoaded(result);
    expect(result.current.connectors).toHaveLength(3);
    expect(result.current.error).toBeUndefined();
  });

  it('return first connector as selectedConnector when no default or last used is set', async () => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['', jest.fn()]);
    const { result } = renderUseGenAIHook();
    expect(result.current.loading).toBe(true);
    await waitForLoaded(result);
    expect(result.current.selectedConnector).toBe('connector-1');
  });

  // Admin sets default AND restricts to default only
  // - force usage of the default connector for all users
  // - only show default connector in UI
  // - ignore localStorage selection if default connector exists there
  it('return defaultConnector if isConnectorSelectionRestricted is true', async () => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['', jest.fn()]);
    mockUiSettingsGet.mockImplementation((key: string, fallback?: any) => {
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return 'connector-2';
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return true;
      return fallback;
    });
    const { result } = renderUseGenAIHook();

    await waitFor(async () => {
      expect(result.current.selectedConnector).toBe('connector-2');
    });

    expect(result.current.selectedConnector).toBe('connector-2');
    expect(result.current.connectors).toHaveLength(1);
  });

  // Admin sets default AND does NOT restrict to default only
  // - for new users who don't have a localStorage selection, use the admin default connector
  // - for users with a previous selection in localStorage, use that as selectedConnector if it exists
  // - ignore default connector if localStorage selection exists
  it('return selectedConnector from localStorage if exists', async () => {
    (useLocalStorage as jest.Mock).mockImplementation(() => ['connector-1', jest.fn()]);
    mockUiSettingsGet.mockImplementation((key: string, fallback?: any) => {
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return 'connector-2';
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return false;
      return fallback;
    });
    const { result } = renderUseGenAIHook();
    expect(result.current.loading).toBe(true);
    await waitForLoaded(result);
    expect(result.current.selectedConnector).toBe('connector-1');
  });

  // Admin sets default AND does NOT restrict to default only
  // - for new users who don't have a localStorage selection, use the admin default connector
  // - return defaultConnector if no localStorage entry exists
  it('return defaultConnector if no localStorage entry exists', async () => {
    (mockAssistant.callApi as jest.Mock).mockResolvedValue(mockConnectors);
    (useLocalStorage as jest.Mock).mockImplementation(() => ['', jest.fn()]);
    mockUiSettingsGet.mockImplementation((key: string, fallback?: any) => {
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return 'connector-2';
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return false;
      return fallback;
    });
    const { result } = renderUseGenAIHook();
    expect(result.current.loading).toBe(true);
    await waitForLoaded(result);
    expect(result.current.selectedConnector).toBe('connector-2');
  });

  it('handles API error', async () => {
    const error = new Error('API failed');
    (mockAssistant.callApi as jest.Mock).mockRejectedValue(error);
    const { result } = renderUseGenAIHook();

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });

    expect(result.current.connectors).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });
});
