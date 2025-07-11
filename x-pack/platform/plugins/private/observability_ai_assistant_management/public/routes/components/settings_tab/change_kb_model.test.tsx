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
  ELSER_IN_EIS_INFERENCE_ID,
  ELSER_ON_ML_NODE_INFERENCE_ID,
  E5_SMALL_INFERENCE_ID,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { UseKnowledgeBaseResult } from '@kbn/ai-assistant/src/hooks';
import type { APIReturnType } from '@kbn/observability-ai-assistant-plugin/public';
import * as modelOptionsModule from '@kbn/ai-assistant/src/utils/get_model_options_for_inference_endpoints';

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

jest.mock('@kbn/observability-ai-assistant-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-ai-assistant-plugin/public'),
  useKibana: () => ({
    services: {
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
    currentInferenceId: ELSER_IN_EIS_INFERENCE_ID,
    concreteWriteIndex: 'index_1',
    endpoint: {
      inference_id: ELSER_IN_EIS_INFERENCE_ID,
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
describe('ChangeKbModel', () => {
  const modelOptions = [
    {
      key: ELSER_IN_EIS_INFERENCE_ID,
      label: 'ELSER v2 (English-only)',
      description:
        'Focus on query meaning, not just keyword matching, using learned associations between terms. It delivers more relevant, context-aware results and works out of the box with no need for deep machine learning expertise.',
    },
    {
      key: E5_SMALL_INFERENCE_ID,
      label: 'E5-small (multilingual)',
      description:
        'E5 is an NLP model by Elastic designed to enhance multilingual semantic search by focusing on query context rather than keywords. E5-small is a cross-platform version compatible with different hardware configurations.',
    },
  ];

  const setupMockGetModelOptions = (options = modelOptions) => {
    mockGetModelOptions.mockReset();
    mockGetModelOptions.mockReturnValue(options);
  };

  const renderComponent = (mockKb: any) => {
    render(<ChangeKbModel knowledgeBase={mockKb} />);
  };

  beforeEach(() => {
    setupMockGetModelOptions();
  });

  it('disables the button when selected model is the same as current and no redeployment needed', () => {
    const mockKb = createMockKnowledgeBase();
    renderComponent(mockKb);
    const button = screen.getByTestId('observabilityAiAssistantKnowledgeBaseUpdateModelButton');
    expect(button).toBeDisabled();
  });

  it('enables the button when a different model is selected', async () => {
    const mockKb = createMockKnowledgeBase({
      status: createMockStatus({ currentInferenceId: '.elser-2-elastic' }),
    });
    renderComponent(mockKb);

    const button = screen.getByTestId('observabilityAiAssistantKnowledgeBaseUpdateModelButton');
    expect(button).toBeDisabled();

    const dropdown = screen.getByTestId('observabilityAiAssistantKnowledgeBaseModelDropdown');
    dropdown.click();

    const newModelOption = await screen.findByText('E5-small (multilingual)');
    newModelOption.click();

    await waitFor(() => {
      expect(button).toBeEnabled();
    });
  });

  it('disables the button when knowledge base is installing', () => {
    const mockKb = createMockKnowledgeBase({ isInstalling: true });
    renderComponent(mockKb);
    const button = screen.getByTestId('observabilityAiAssistantKnowledgeBaseUpdateModelButton');
    expect(button).toBeDisabled();
  });

  // Legacy inferenceId tests cover the component behavior when currentInferenceId is LEGACY_CUSTOM_INFERENCE_ID
  // TODO: Remove these tests after https://github.com/elastic/kibana/issues/227103 is implemented
  const legacyInferenceTests = (inferenceId: string, label: string) => {
    describe(`when ${inferenceId} is available`, () => {
      beforeEach(() => {
        setupMockGetModelOptions([
          {
            key: inferenceId,
            label,
            description:
              'Focus on query meaning, not just keyword matching, using learned associations between terms. It delivers more relevant, context-aware results and works out of the box with no need for deep machine learning expertise.',
          },
          {
            key: '.multilingual-e5-small-elasticsearch',
            label: 'E5-small (multilingual)',
            description:
              'E5 is an NLP model by Elastic designed to enhance multilingual semantic search by focusing on query context rather than keywords. E5-small is a cross-platform version compatible with different hardware configurations.',
          },
        ]);
      });

      it('remaps legacy currentInferenceId to ELSER ID in dropdown', () => {
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
        expect(dropdown).toHaveTextContent(label);
      });

      it('disables the button initially when legacy inference is active', () => {
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

        const button = screen.getByTestId('observabilityAiAssistantKnowledgeBaseUpdateModelButton');
        expect(button).toBeDisabled();
      });

      it('enables the button when user selects E5 model while legacy inference is active', async () => {
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

        const e5Option = await screen.findByText('E5-small (multilingual)');
        e5Option.click();

        await waitFor(() => {
          const button = screen.getByTestId(
            'observabilityAiAssistantKnowledgeBaseUpdateModelButton'
          );
          expect(button).toBeEnabled();
        });
      });
    });
  };

  legacyInferenceTests(ELSER_IN_EIS_INFERENCE_ID, 'ELSER v2 (English-only)');
  legacyInferenceTests(ELSER_ON_ML_NODE_INFERENCE_ID, 'ELSER v2 (English-only)');
});
