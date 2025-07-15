/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ProductDocEntry } from './product_doc_entry';
import { useKnowledgeBase } from '@kbn/ai-assistant';
import { useGetProductDocStatus } from '../../../hooks/use_get_product_doc_status';
import {
  ELSER_ON_ML_NODE_INFERENCE_ID,
  LEGACY_CUSTOM_INFERENCE_ID,
} from '@kbn/observability-ai-assistant-plugin/public';

// Mocks
jest.mock('@kbn/ai-assistant', () => ({
  useKnowledgeBase: jest.fn(),
}));

jest.mock('../../../hooks/use_get_product_doc_status', () => ({
  useGetProductDocStatus: jest.fn(),
}));

jest.mock('../../../hooks/use_install_product_doc', () => ({
  useInstallProductDoc: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('../../../hooks/use_uninstall_product_doc', () => ({
  useUninstallProductDoc: () => ({ mutateAsync: jest.fn() }),
}));

describe('ProductDocEntry', () => {
  it('calls useGetProductDocStatus with ELSER_ON_ML_NODE_INFERENCE_ID when inference ID is LEGACY_CUSTOM_INFERENCE_ID', async () => {
    // Mock Knowledge Base
    (useKnowledgeBase as jest.Mock).mockReturnValue({
      status: {
        value: {
          currentInferenceId: LEGACY_CUSTOM_INFERENCE_ID,
        },
      },
    });

    // Mock Product Doc Status
    (useGetProductDocStatus as jest.Mock).mockReturnValue({
      status: {
        overall: 'installed',
        inferenceId: ELSER_ON_ML_NODE_INFERENCE_ID,
        perProducts: {
          elasticsearch: { status: 'installed', version: '8.18' },
          kibana: { status: 'installed', version: '8.18' },
          observability: { status: 'installed', version: '8.18' },
          security: { status: 'installed', version: '8.18' },
        },
      },
    });

    render(<ProductDocEntry />);

    // Assert that the "Installed" badge appears
    await waitFor(() => {
      expect(screen.getByText('Installed')).toBeInTheDocument();
    });

    // Assert that the hook was called with the correct remapped ID
    expect(useGetProductDocStatus).toHaveBeenCalledWith(ELSER_ON_ML_NODE_INFERENCE_ID);
  });

  it('calls useGetProductDocStatus with the current inference ID when inference ID is not LEGACY_CUSTOM_INFERENCE_ID"', async () => {
    // Mock Knowledge Base
    (useKnowledgeBase as jest.Mock).mockReturnValue({
      status: {
        value: {
          currentInferenceId: ELSER_ON_ML_NODE_INFERENCE_ID,
        },
      },
    });

    // Mock Product Doc Status
    (useGetProductDocStatus as jest.Mock).mockReturnValue({
      status: {
        overall: 'installed',
        inferenceId: ELSER_ON_ML_NODE_INFERENCE_ID,
        perProducts: {
          elasticsearch: { status: 'installed', version: '8.18' },
          kibana: { status: 'installed', version: '8.18' },
          observability: { status: 'installed', version: '8.18' },
          security: { status: 'installed', version: '8.18' },
        },
      },
    });

    render(<ProductDocEntry />);

    // Assert that the "Installed" badge appears
    await waitFor(() => {
      expect(screen.getByText('Installed')).toBeInTheDocument();
    });

    // Assert that the hook was called with the correct remapped ID
    expect(useGetProductDocStatus).toHaveBeenCalledWith(ELSER_ON_ML_NODE_INFERENCE_ID);
  });
});
