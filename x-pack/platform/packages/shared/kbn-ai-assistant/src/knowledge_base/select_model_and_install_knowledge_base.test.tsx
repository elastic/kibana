/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ModelOptionsData } from '../utils/get_model_options_for_inference_endpoints';
import { SelectModelAndInstallKnowledgeBase } from './select_model_and_install_knowledge_base';

jest.mock('../hooks/use_inference_endpoints', () => ({
  useInferenceEndpoints: () => ({
    inferenceEndpoints: [{ inference_id: 'id1' }, { inference_id: 'id2' }],
    isLoading: false,
  }),
}));

jest.mock('../utils/get_model_options_for_inference_endpoints', () => ({
  getModelOptionsForInferenceEndpoints: ({
    endpoints,
    isKnowledgeBaseInstalled,
  }: {
    endpoints: any[];
    isKnowledgeBaseInstalled?: boolean;
  }): ModelOptionsData[] =>
    // For new installations (isKnowledgeBaseInstalled=false), return single model (simulating Jina-only behavior)
    isKnowledgeBaseInstalled === false
      ? [{ key: endpoints[0]?.inference_id ?? 'id1', label: 'Label1', description: 'Desc1' }]
      : endpoints.map((e, i) => ({
          key: e.inference_id,
          label: `Label${i + 1}`,
          description: `Desc${i + 1}`,
        })),
}));

const onInstall = jest.fn();

function renderComponent() {
  return render(<SelectModelAndInstallKnowledgeBase onInstall={onInstall} isInstalling={false} />);
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

  it('disables the dropdown when there is only one model option (new installations with Jina)', () => {
    // For new installations, the mock returns only one model option (simulating Jina-only behavior)
    const dropdown = screen.getByTestId('observabilityAiAssistantKnowledgeBaseModelDropdown');
    expect(dropdown).toBeDisabled();
  });
});
