/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ProductDocSetting } from './product_doc_setting';
import {
  APIReturnType,
  ELSER_ON_ML_NODE_INFERENCE_ID,
  InferenceModelState,
  LEGACY_CUSTOM_INFERENCE_ID,
} from '@kbn/observability-ai-assistant-plugin/public';
import { UseKnowledgeBaseResult } from '@kbn/ai-assistant';

const createMockStatus = (
  overrides?: Partial<APIReturnType<'GET /internal/observability_ai_assistant/kb/status'>>
): UseKnowledgeBaseResult['status'] => ({
  value: {
    enabled: true,
    inferenceModelState: InferenceModelState.READY,
    isReIndexing: false,
    currentInferenceId: ELSER_ON_ML_NODE_INFERENCE_ID,
    concreteWriteIndex: 'index_1',
    endpoint: {
      inference_id: ELSER_ON_ML_NODE_INFERENCE_ID,
      task_type: 'text_embedding',
      service: 'my-service',
      service_settings: {},
    },
    productDocStatus: 'uninstalled',
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
  isProductDocInstalling: false,
  isProductDocUninstalling: false,
  installProductDoc: jest.fn().mockResolvedValue(undefined),
  uninstallProductDoc: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('ProductDocSetting', () => {
  it('should render the installed state correctly', async () => {
    const mockKnowledgeBase = createMockKnowledgeBase({
      isInstalling: false,
      isWarmingUpModel: false,
      status: createMockStatus({
        inferenceModelState: InferenceModelState.READY,
        currentInferenceId: LEGACY_CUSTOM_INFERENCE_ID,
        endpoint: {
          inference_id: LEGACY_CUSTOM_INFERENCE_ID,
          task_type: 'text_embedding',
          service: 'my-service',
          service_settings: {},
        },
        productDocStatus: 'installed',
      }),
      isProductDocInstalling: false,
      isProductDocUninstalling: false,
    });

    render(
      <ProductDocSetting
        knowledgeBase={mockKnowledgeBase}
        currentlyDeployedInferenceId={ELSER_ON_ML_NODE_INFERENCE_ID}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Installed')).toBeInTheDocument();
    });
  });

  it('should render the uninstalled state correctly', async () => {
    const mockKnowledgeBase = createMockKnowledgeBase({
      status: createMockStatus({ productDocStatus: 'uninstalled' }),
    });

    render(
      <ProductDocSetting
        knowledgeBase={mockKnowledgeBase}
        currentlyDeployedInferenceId={undefined}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Install')).toBeInTheDocument();
    });
  });
});
