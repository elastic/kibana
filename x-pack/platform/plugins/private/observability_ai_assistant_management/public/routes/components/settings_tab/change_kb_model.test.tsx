/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ChangeKbModel } from './change_kb_model';
import {
  KnowledgeBaseState,
  LEGACY_CUSTOM_INFERENCE_ID,
  ELSER_ON_ML_NODE_INFERENCE_ID,
  E5_SMALL_INFERENCE_ID,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { UseKnowledgeBaseResult } from '@kbn/ai-assistant/src/hooks';
import type { APIReturnType } from '@kbn/observability-ai-assistant-plugin/public';
import * as modelOptionsModule from '@kbn/ai-assistant/src/utils/get_model_options_for_inference_endpoints';
import {
  e5SmallDescription,
  e5SmallTitle,
  elserDescription,
  elserTitle,
} from '@kbn/ai-assistant/src/utils/get_model_options_for_inference_endpoints';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../hooks/use_install_product_doc', () => ({
  useInstallProductDoc: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock('@kbn/ai-assistant/src/hooks', () => ({
  useInferenceEndpoints: () => ({
    inferenceEndpoints: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addError: jest.fn(),
          addWarning: jest.fn(),
          addInfo: jest.fn(),
        },
      },
      overlays: {
        openConfirm: jest.fn(() => Promise.resolve(true)),
      },
    },
  }),
}));

jest.mock('@kbn/ai-assistant/src/utils/get_model_options_for_inference_endpoints');

const mockGetModelOptions = jest.mocked(modelOptionsModule.getModelOptionsForInferenceEndpoints);

const createMockStatus = (
  overrides?: Partial<APIReturnType<'GET /internal/observability_ai_assistant/kb/status'>>
): UseKnowledgeBaseResult['status'] => ({
  value: {
    enabled: true,
    kbState: KnowledgeBaseState.READY,
    isReIndexing: false,
    currentInferenceId: ELSER_ON_ML_NODE_INFERENCE_ID,
    concreteWriteIndex: 'index_1',
    endpoint: {
      inference_id: ELSER_ON_ML_NODE_INFERENCE_ID,
      task_type: 'text_embedding',
      service: 'my-service',
      service_settings: {},
    },
    ...overrides,
  },
  loading: false,
  refresh: () => undefined,
});

const createMockKnowledgeBase = (
  overrides: Partial<UseKnowledgeBaseResult> = {}
): UseKnowledgeBaseResult => ({
  status: createMockStatus(),
  isInstalling: false,
  isWarmingUpModel: false,
  isPolling: false,
  install: jest.fn().mockResolvedValue(undefined),
  warmupModel: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const modelOptions = [
  {
    key: ELSER_ON_ML_NODE_INFERENCE_ID,
    label: elserTitle,
    description: elserDescription,
  },
  {
    key: E5_SMALL_INFERENCE_ID,
    label: e5SmallTitle,
    description: e5SmallDescription,
  },
];

const setupMockGetModelOptions = (options = modelOptions) => {
  mockGetModelOptions.mockReset();
  mockGetModelOptions.mockReturnValue(options);
};

const renderComponent = (mockKb: UseKnowledgeBaseResult) => {
  const queryClient = new QueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <ChangeKbModel knowledgeBase={mockKb} />{' '}
    </QueryClientProvider>
  );
};

describe('ChangeKbModel', () => {
  beforeEach(() => {
    setupMockGetModelOptions();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disables the `Update` button when selected model is the same as current and no redeployment needed', () => {
    const mockKb = createMockKnowledgeBase();
    renderComponent(mockKb);

    const button = screen.getByTestId('observabilityAiAssistantKnowledgeBaseUpdateModelButton');
    expect(button).toBeDisabled();
  });

  it('enables the `Update` button when a different model is selected', async () => {
    const mockKb = createMockKnowledgeBase();
    renderComponent(mockKb);

    const button = screen.getByTestId('observabilityAiAssistantKnowledgeBaseUpdateModelButton');
    expect(button).toBeDisabled();

    const dropdown = screen.getByTestId('observabilityAiAssistantKnowledgeBaseModelDropdown');
    dropdown.click();

    const newModelOption = await screen.findByText(e5SmallTitle);
    newModelOption.click();

    await waitFor(() => {
      expect(button).toBeEnabled();
    });
  });

  it('disables the `Update` button when knowledge base is installing', () => {
    const mockKb = createMockKnowledgeBase({ isInstalling: true });
    renderComponent(mockKb);

    const button = screen.getByTestId('observabilityAiAssistantKnowledgeBaseUpdateModelButton');
    expect(button).toBeDisabled();
  });

  // Legacy inference ID tests cover the component behavior when currentInferenceId is LEGACY_CUSTOM_INFERENCE_ID
  // TODO: Remove these tests after https://github.com/elastic/kibana/issues/227103 is implemented
  describe(`when the current inference ID is ${LEGACY_CUSTOM_INFERENCE_ID}`, () => {
    it('remaps the legacy inference ID to the ELSER inference ID in the dropdown', () => {
      const mockKb = createMockKnowledgeBase({
        status: createMockStatus({
          currentInferenceId: LEGACY_CUSTOM_INFERENCE_ID,
          endpoint: {
            inference_id: LEGACY_CUSTOM_INFERENCE_ID,
            task_type: 'text_embedding',
            service: 'my-service',
            service_settings: {},
          },
        }),
      });
      renderComponent(mockKb);

      const dropdown = screen.getByTestId('observabilityAiAssistantKnowledgeBaseModelDropdown');
      expect(dropdown).toHaveTextContent(elserTitle);
    });

    it('disables the `Update` button when the user selects ELSER model from the dropdown', async () => {
      const mockKb = createMockKnowledgeBase({
        status: createMockStatus({
          currentInferenceId: LEGACY_CUSTOM_INFERENCE_ID,
          endpoint: {
            inference_id: LEGACY_CUSTOM_INFERENCE_ID,
            task_type: 'text_embedding',
            service: 'my-service',
            service_settings: {},
          },
        }),
      });
      renderComponent(mockKb);

      const dropdown = screen.getByTestId('observabilityAiAssistantKnowledgeBaseModelDropdown');
      dropdown.click();

      const elserOption = await screen.findByText(elserTitle);
      elserOption.click();

      await waitFor(() => {
        const button = screen.getByTestId('observabilityAiAssistantKnowledgeBaseUpdateModelButton');
        expect(button).toBeDisabled();
      });
    });

    it('enables the `Update` button when user selects E5 model from the dropdown', async () => {
      const mockKb = createMockKnowledgeBase({
        status: createMockStatus({
          currentInferenceId: LEGACY_CUSTOM_INFERENCE_ID,
          endpoint: {
            inference_id: LEGACY_CUSTOM_INFERENCE_ID,
            task_type: 'text_embedding',
            service: 'my-service',
            service_settings: {},
          },
        }),
      });
      renderComponent(mockKb);

      const dropdown = screen.getByTestId('observabilityAiAssistantKnowledgeBaseModelDropdown');
      dropdown.click();

      const e5Option = await screen.findByText(e5SmallTitle);
      e5Option.click();

      await waitFor(() => {
        const button = screen.getByTestId('observabilityAiAssistantKnowledgeBaseUpdateModelButton');
        expect(button).toBeEnabled();
      });
    });
  });
});
