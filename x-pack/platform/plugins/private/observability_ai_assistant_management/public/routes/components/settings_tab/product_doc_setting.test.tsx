/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductDocSetting } from './product_doc_setting';
import type { APIReturnType } from '@kbn/observability-ai-assistant-plugin/public';
import {
  ELSER_ON_ML_NODE_INFERENCE_ID,
  InferenceModelState,
  LEGACY_CUSTOM_INFERENCE_ID,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { UseKnowledgeBaseResult } from '@kbn/ai-assistant';

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
  it('renders the installed state with uninstall link', async () => {
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
      expect(screen.getByTestId('productDocStatusBadge')).toHaveTextContent('Installed');
    });
    const action = screen.getByTestId('productDocActionLink');
    expect(action).toHaveTextContent('Uninstall');
  });

  it('renders the uninstalled state with install link', async () => {
    const mockKnowledgeBase = createMockKnowledgeBase({
      isInstalling: false,
      isWarmingUpModel: false,
      status: createMockStatus({
        productDocStatus: 'uninstalled',
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
      expect(screen.getByTestId('productDocStatusBadge')).toHaveTextContent('Not installed');
      expect(screen.getByTestId('productDocActionLink')).toHaveTextContent('Install');
    });
  });

  it('doesnt render an install link when the model is NOT_INSTALLED', async () => {
    const mockKnowledgeBase = createMockKnowledgeBase({
      isInstalling: false,
      isWarmingUpModel: false,
      status: createMockStatus({
        inferenceModelState: InferenceModelState.NOT_INSTALLED,
        currentInferenceId: LEGACY_CUSTOM_INFERENCE_ID,
        endpoint: {
          inference_id: LEGACY_CUSTOM_INFERENCE_ID,
          task_type: 'text_embedding',
          service: 'my-service',
          service_settings: {},
        },
        productDocStatus: 'uninstalled',
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
      expect(screen.getByTestId('productDocStatusBadge')).toHaveTextContent('Not installed');
    });

    const link = screen.queryByTestId('productDocActionLink');
    expect(link).not.toBeInTheDocument();
  });

  it('shows Retry link and warning callout on backend error and retries install', async () => {
    const installProductDoc = jest.fn().mockResolvedValue(undefined);

    const mockKnowledgeBase = createMockKnowledgeBase({
      installProductDoc,
      isInstalling: false,
      isWarmingUpModel: false,
      status: createMockStatus({
        inferenceModelState: InferenceModelState.NOT_INSTALLED,
        currentInferenceId: LEGACY_CUSTOM_INFERENCE_ID,
        endpoint: {
          inference_id: LEGACY_CUSTOM_INFERENCE_ID,
          task_type: 'text_embedding',
          service: 'my-service',
          service_settings: {},
        },
        productDocStatus: 'error',
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

    expect(await screen.findByTestId('productDocNotAvailableCallout')).toBeInTheDocument();

    const retry = await screen.findByTestId('productDocRetryLink');
    expect(retry).toHaveTextContent('Retry');

    await userEvent.click(retry);
    expect(installProductDoc).toHaveBeenCalledWith(ELSER_ON_ML_NODE_INFERENCE_ID);
  });

  it('does not call install when not eligible (no inference id)', async () => {
    const installProductDoc = jest.fn().mockResolvedValue(undefined);
    const mockKnowledgeBase = createMockKnowledgeBase({
      installProductDoc,
      status: createMockStatus({ productDocStatus: 'uninstalled' }),
    });

    render(
      <ProductDocSetting
        knowledgeBase={mockKnowledgeBase}
        currentlyDeployedInferenceId={ELSER_ON_ML_NODE_INFERENCE_ID}
      />
    );

    const action = await screen.findByTestId('productDocActionLink');
    expect(action).toHaveTextContent('Install');

    await userEvent.click(action);

    expect(installProductDoc).toHaveBeenCalled();
  });
});
