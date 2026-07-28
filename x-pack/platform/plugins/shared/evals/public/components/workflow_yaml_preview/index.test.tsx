/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { WorkflowYamlPreview } from '.';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('WorkflowYamlPreview', () => {
  it('renders the empty prompt when no yaml, loading, or error is provided', () => {
    render(<WorkflowYamlPreview />, { wrapper: Wrapper });

    expect(screen.getByText(/Complete the form to preview/)).toBeInTheDocument();
    expect(screen.queryByTestId('evalsWorkflowYamlPreview')).not.toBeInTheDocument();
  });

  it('renders a loading indicator while generating', () => {
    render(<WorkflowYamlPreview isLoading />, { wrapper: Wrapper });

    expect(screen.getByText(/Generating workflow YAML/)).toBeInTheDocument();
  });

  it('renders the error message when an error is provided', () => {
    render(<WorkflowYamlPreview error="boom" />, { wrapper: Wrapper });

    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByTestId('evalsWorkflowYamlPreviewError')).toBeInTheDocument();
    expect(screen.queryByTestId('evalsWorkflowYamlPreview')).not.toBeInTheDocument();
  });

  it('renders the yaml in a copyable code block when provided', () => {
    render(<WorkflowYamlPreview yaml={'name: my-workflow\nsteps: []'} />, { wrapper: Wrapper });

    const block = screen.getByTestId('evalsWorkflowYamlPreview');
    expect(block).toBeInTheDocument();
    expect(block).toHaveTextContent('name: my-workflow');
  });

  it('prefers the error state over yaml and loading', () => {
    render(<WorkflowYamlPreview yaml="name: x" isLoading error="failed" />, { wrapper: Wrapper });

    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.queryByTestId('evalsWorkflowYamlPreview')).not.toBeInTheDocument();
  });
});
