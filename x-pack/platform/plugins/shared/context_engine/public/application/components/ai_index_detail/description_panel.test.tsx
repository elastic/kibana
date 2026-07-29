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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { DescriptionPanel } from './description_panel';

let services: ReturnType<typeof coreMock.createStart>;

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const renderWithProviders = (
  ui: React.ReactElement,
  coreServices: ReturnType<typeof coreMock.createStart> = coreMock.createStart()
) => {
  services = coreServices;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
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
        isManaged={false}
      />
    );

    expect(screen.getByText('My custom description')).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_FALLBACK)).not.toBeInTheDocument();
  });

  it('renders the empty fallback when no description is provided', () => {
    renderWithProviders(
      <DescriptionPanel isLoading={false} aiIndex={aiIndex} onSaved={jest.fn()} isManaged={false} />
    );

    expect(screen.getByText(EMPTY_FALLBACK)).toBeInTheDocument();
  });

  it('does not render the description text while loading', () => {
    renderWithProviders(
      <DescriptionPanel
        isLoading
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={jest.fn()}
        isManaged={false}
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
        isManaged={false}
      />
    );

    fireEvent.click(screen.getByTestId('contextEditDescriptionButton'));

    expect(screen.getByTestId('contextDescriptionTextArea')).toHaveValue('My custom description');
  });

  it('hides the edit button for managed AI indexes', () => {
    renderWithProviders(
      <DescriptionPanel isLoading={false} aiIndex={aiIndex} onSaved={jest.fn()} isManaged />
    );

    expect(screen.queryByTestId('contextEditDescriptionButton')).not.toBeInTheDocument();
  });

  it('saves the edited description, exits edit mode, and calls onSaved', async () => {
    const onSaved = jest.fn();
    const testServices = coreMock.createStart();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(
      <DescriptionPanel
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    fireEvent.click(screen.getByTestId('contextEditDescriptionButton'));
    fireEvent.change(screen.getByTestId('contextDescriptionTextArea'), {
      target: { value: 'Updated description' },
    });
    fireEvent.click(screen.getByTestId('contextDescriptionSaveButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: JSON.stringify({
            dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
            automations: [],
            sources: [],
            description: 'Updated description',
          }),
        })
      );
    });

    expect(screen.queryByTestId('contextDescriptionTextArea')).not.toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('keeps the editor open and does not call onSaved when the save fails', async () => {
    const onSaved = jest.fn();
    const testServices = coreMock.createStart();
    testServices.http.put.mockRejectedValue(new Error('save failed'));

    renderWithProviders(
      <DescriptionPanel
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    fireEvent.click(screen.getByTestId('contextEditDescriptionButton'));
    fireEvent.change(screen.getByTestId('contextDescriptionTextArea'), {
      target: { value: 'Updated description' },
    });
    fireEvent.click(screen.getByTestId('contextDescriptionSaveButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByTestId('contextDescriptionTextArea')).toHaveValue('Updated description');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('discards draft changes when editing is cancelled', () => {
    const testServices = coreMock.createStart();

    renderWithProviders(
      <DescriptionPanel
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={jest.fn()}
        isManaged={false}
      />,
      testServices
    );

    fireEvent.click(screen.getByTestId('contextEditDescriptionButton'));
    fireEvent.change(screen.getByTestId('contextDescriptionTextArea'), {
      target: { value: 'Draft that should be discarded' },
    });
    fireEvent.click(screen.getByTestId('contextDescriptionCancelButton'));

    expect(screen.queryByTestId('contextDescriptionTextArea')).not.toBeInTheDocument();
    expect(testServices.http.put).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('contextEditDescriptionButton'));

    expect(screen.getByTestId('contextDescriptionTextArea')).toHaveValue('My custom description');
  });

  it('shows a loading state on the Save button while the PUT is in flight', async () => {
    const testServices = coreMock.createStart();
    testServices.http.put.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(
      <DescriptionPanel
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={jest.fn()}
        isManaged={false}
      />,
      testServices
    );

    fireEvent.click(screen.getByTestId('contextEditDescriptionButton'));
    fireEvent.change(screen.getByTestId('contextDescriptionTextArea'), {
      target: { value: 'Updated description' },
    });
    fireEvent.click(screen.getByTestId('contextDescriptionSaveButton'));

    await waitFor(() => {
      expect(screen.getByTestId('contextDescriptionSaveButton')).toBeDisabled();
    });
  });
});
