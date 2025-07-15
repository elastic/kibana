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
import { useGetProductDoc } from '../../../hooks/use_get_product_doc';

jest.mock('../../../hooks/use_get_product_doc', () => ({
  useGetProductDoc: jest.fn(),
}));

jest.mock('../../../hooks/use_install_product_doc', () => ({
  useInstallProductDoc: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('../../../hooks/use_uninstall_product_doc', () => ({
  useUninstallProductDoc: () => ({ mutateAsync: jest.fn() }),
}));

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

describe('ProductDocEntry', () => {
  it('calls useGetProductDocStatus with ELSER_ON_ML_NODE_INFERENCE_ID when inference ID is LEGACY_CUSTOM_INFERENCE_ID', async () => {
    (useGetProductDoc as jest.Mock).mockReturnValue({
      status: 'installed',
    });

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

    render(<ProductDocEntry knowledgeBase={mockKnowledgeBase} />);

    await waitFor(() => {
      expect(screen.getByText('Installed')).toBeInTheDocument();
    });

    expect(useGetProductDoc).toHaveBeenCalledWith(ELSER_ON_ML_NODE_INFERENCE_ID);
  });

  it('calls useGetProductDocStatus with the current inference ID when inference ID is not LEGACY_CUSTOM_INFERENCE_ID"', async () => {
    const mockKnowledgeBase = createMockKnowledgeBase();

    // Mock Product Doc Status
    (useGetProductDoc as jest.Mock).mockReturnValue({
      status: 'installed',
    });

    render(<ProductDocEntry knowledgeBase={mockKnowledgeBase} />);

    // Assert that the "Installed" badge appears
    await waitFor(() => {
      expect(screen.getByText('Installed')).toBeInTheDocument();
    });

    // Assert that the hook was called with the correct remapped ID
    expect(useGetProductDoc).toHaveBeenCalledWith(ELSER_ON_ML_NODE_INFERENCE_ID);
  });
});
