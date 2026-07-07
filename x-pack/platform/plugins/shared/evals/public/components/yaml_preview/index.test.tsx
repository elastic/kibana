/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { YamlPreview } from '.';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('YamlPreview', () => {
  it('renders the empty prompt when no yaml, loading, or error is provided', () => {
    render(<YamlPreview />, { wrapper: Wrapper });

    expect(screen.getByText(/Complete the form to preview/)).toBeInTheDocument();
    expect(screen.queryByTestId('evalsYamlPreview')).not.toBeInTheDocument();
  });

  it('renders a loading indicator while generating', () => {
    render(<YamlPreview isLoading />, { wrapper: Wrapper });

    expect(screen.getByText(/Generating workflow YAML/)).toBeInTheDocument();
  });

  it('renders the error message when an error is provided', () => {
    render(<YamlPreview error="boom" />, { wrapper: Wrapper });

    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.queryByTestId('evalsYamlPreview')).not.toBeInTheDocument();
  });

  it('renders the yaml in a copyable code block when provided', () => {
    render(<YamlPreview yaml={'name: my-workflow\nsteps: []'} />, { wrapper: Wrapper });

    const block = screen.getByTestId('evalsYamlPreview');
    expect(block).toBeInTheDocument();
    expect(block).toHaveTextContent('name: my-workflow');
  });

  it('prefers the error state over yaml and loading', () => {
    render(<YamlPreview yaml="name: x" isLoading error="failed" />, { wrapper: Wrapper });

    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.queryByTestId('evalsYamlPreview')).not.toBeInTheDocument();
  });
});
