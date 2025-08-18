/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ProductDocEntry } from './product_doc_entry';
import {
  APIReturnType,
  ELSER_ON_ML_NODE_INFERENCE_ID,
  KnowledgeBaseState,
  LEGACY_CUSTOM_INFERENCE_ID,
} from '@kbn/observability-ai-assistant-plugin/public';
import { UseKnowledgeBaseResult } from '@kbn/ai-assistant';
import { UseProductDoc } from '../../../hooks/use_product_doc';
import { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';

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

const createProductDoc = (overrides: Partial<UseProductDoc> = {}) => ({
  status: 'uninstalled' as InstallationStatus,
  isLoading: false,
  installProductDoc: jest.fn().mockResolvedValue({} as any),
  uninstallProductDoc: jest.fn().mockResolvedValue({} as any),
  ...overrides,
});

describe('ProductDocEntry', () => {
  it('should render the installed state correctly', async () => {
    const mockKnowledgeBase = createMockKnowledgeBase({
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

    const productDoc = createProductDoc({
      status: 'installed',
    });

    render(
      <ProductDocEntry
        knowledgeBase={mockKnowledgeBase}
        productDoc={productDoc}
        currentlyDeployedInferenceId={undefined}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Installed')).toBeInTheDocument();
    });
  });

  it('should render the uninstalled state correctly', async () => {
    const mockKnowledgeBase = createMockKnowledgeBase();
    const productDoc = createProductDoc();

    render(
      <ProductDocEntry
        knowledgeBase={mockKnowledgeBase}
        productDoc={productDoc}
        currentlyDeployedInferenceId={undefined}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Install')).toBeInTheDocument();
    });
  });
});
