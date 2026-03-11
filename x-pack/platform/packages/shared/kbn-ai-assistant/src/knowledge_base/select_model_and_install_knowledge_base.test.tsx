/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ModelOptionsData } from '../utils/get_model_options_for_inference_endpoints';
import { SelectModelAndInstallKnowledgeBase } from './select_model_and_install_knowledge_base';

jest.mock('../hooks/use_inference_endpoints', () => ({
  useInferenceEndpoints: () => ({
    inferenceEndpoints: [{ inference_id: 'id1' }, { inference_id: 'id2' }],
    isLoading: false,
  }),
}));

jest.mock('../utils/get_model_options_for_inference_endpoints', () => ({
  getModelOptionsForInferenceEndpoints: ({ endpoints }: { endpoints: any[] }): ModelOptionsData[] =>
    endpoints.map((e, i) => ({
      key: e.inference_id,
      label: `Label${i + 1}`,
      description: `Desc${i + 1}`,
    })),
}));

const mockSetEisKnowledgeBaseCalloutDismissed = jest.fn();

jest.mock('@kbn/observability-ai-assistant-plugin/public', () => ({
  EIS_PRECONFIGURED_INFERENCE_IDS: ['id1'],
  EisKnowledgeBaseCallout: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (
    <div data-test-subj="eisKnowledgeBaseCallout" data-is-open={isOpen}>
      {children}
    </div>
  ),
  useEisKnowledgeBaseCalloutDismissed: () => [false, mockSetEisKnowledgeBaseCalloutDismissed],
  useAIAgentTourDismissed: () => [true],
}));

const onInstall = jest.fn();

function renderComponent(props = {}) {
  return render(
    <SelectModelAndInstallKnowledgeBase onInstall={onInstall} isInstalling={false} {...props} />
  );
}

describe('SelectModelAndInstallKnowledgeBase', () => {
  beforeEach(() => {
    renderComponent();
  });

  it('renders heading, subtitle, and the dropdown with a default model selected', () => {
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'Get started by setting up the Knowledge Base'
    );

    const learnMore = screen.getByRole('link', { name: /Learn more/i });
    expect(learnMore).toHaveAttribute('href', expect.stringContaining('ml-nlp-built-in-models'));

    expect(screen.getByText('Label1')).toBeInTheDocument();
  });

  it('calls onInstall with default id when the install button is clicked', () => {
    const installBtn = screen.getByRole('button', { name: /Install Knowledge Base/i });
    fireEvent.click(installBtn);
    expect(onInstall).toHaveBeenCalledWith('id1');
  });

  it('allows changing selection and installing the KB with the inference_id for the new model', async () => {
    const defaultSelection = screen.getByText('Label1');
    fireEvent.click(defaultSelection);

    const nextSelection = screen.getByText('Label2');
    await waitFor(() => nextSelection);
    fireEvent.click(nextSelection);

    expect(nextSelection).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Install Knowledge Base/i }));
    expect(onInstall).toHaveBeenCalledWith('id2');
  });

  it('renders the EIS callout when selected model is from EIS', () => {
    const callout = screen.getByTestId('eisKnowledgeBaseCallout');
    expect(callout).toBeInTheDocument();
    expect(callout).toHaveAttribute('data-is-open', 'true');
  });

  it('does not show the EIS callout when selected model is not from EIS', async () => {
    const defaultSelection = screen.getByText('Label1');
    fireEvent.click(defaultSelection);

    const nextSelection = screen.getByText('Label2');
    await waitFor(() => nextSelection);
    fireEvent.click(nextSelection);

    const callout = screen.getByTestId('eisKnowledgeBaseCallout');
    expect(callout).toHaveAttribute('data-is-open', 'false');
  });
});
