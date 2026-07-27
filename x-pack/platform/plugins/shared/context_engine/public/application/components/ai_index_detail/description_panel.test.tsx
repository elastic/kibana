/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { DescriptionPanel } from './description_panel';

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={coreMock.createStart()}>
          <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const EMPTY_FALLBACK = /No sources yet/;

describe('DescriptionPanel', () => {
  it('renders the provided description when not loading', () => {
    renderWithProviders(
      <DescriptionPanel
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={jest.fn()}
      />
    );

    expect(screen.getByText('My custom description')).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_FALLBACK)).not.toBeInTheDocument();
  });

  it('renders the empty fallback when no description is provided', () => {
    renderWithProviders(
      <DescriptionPanel isLoading={false} aiIndex={aiIndex} onSaved={jest.fn()} />
    );

    expect(screen.getByText(EMPTY_FALLBACK)).toBeInTheDocument();
  });

  it('does not render the description text while loading', () => {
    renderWithProviders(
      <DescriptionPanel
        isLoading
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={jest.fn()}
      />
    );

    expect(screen.queryByText('My custom description')).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_FALLBACK)).not.toBeInTheDocument();
  });

  it('shows the editor when the edit button is clicked', () => {
    renderWithProviders(
      <DescriptionPanel
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('contextEditDescriptionButton'));

    expect(screen.getByTestId('contextDescriptionTextArea')).toHaveValue('My custom description');
  });
});
