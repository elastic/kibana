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
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React, { useState } from 'react';
import { MAX_AI_INDEX_DESCRIPTION_LENGTH } from '../../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { GeneralSection } from './general_section';

let services: ReturnType<typeof coreMock.createStart>;

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
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

describe('GeneralSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the General panel and existing description in the textarea', () => {
    renderWithProviders(
      <GeneralSection
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={jest.fn()}
      />
    );

    expect(screen.getByTestId('contextAiIndexSettingsGeneral')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByTestId('contextDescriptionTextArea')).toHaveValue('My custom description');
  });

  it('does not show save or discard for trailing whitespace only', () => {
    renderWithProviders(
      <GeneralSection
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={jest.fn()}
      />
    );

    fireEvent.change(screen.getByTestId('contextDescriptionTextArea'), {
      target: { value: 'My custom description  ' },
    });

    expect(screen.queryByTestId('contextDescriptionSaveButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextDescriptionCancelButton')).not.toBeInTheDocument();
  });

  it('does not show save or discard until the description changes', () => {
    renderWithProviders(
      <GeneralSection
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={jest.fn()}
      />
    );

    expect(screen.queryByTestId('contextDescriptionSaveButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextDescriptionCancelButton')).not.toBeInTheDocument();
  });

  it('shows Save changes and Discard after typing', () => {
    renderWithProviders(
      <GeneralSection
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={jest.fn()}
      />
    );

    fireEvent.change(screen.getByTestId('contextDescriptionTextArea'), {
      target: { value: 'Updated description' },
    });

    expect(screen.getByTestId('contextDescriptionSaveButton')).toHaveTextContent('Save changes');
    expect(screen.getByTestId('contextDescriptionCancelButton')).toHaveTextContent('Discard');
  });

  it('restores the saved description when Discard is clicked', () => {
    renderWithProviders(
      <GeneralSection
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={jest.fn()}
      />
    );

    fireEvent.change(screen.getByTestId('contextDescriptionTextArea'), {
      target: { value: 'Draft that should be discarded' },
    });
    fireEvent.click(screen.getByTestId('contextDescriptionCancelButton'));

    expect(screen.getByTestId('contextDescriptionTextArea')).toHaveValue('My custom description');
    expect(screen.queryByTestId('contextDescriptionSaveButton')).not.toBeInTheDocument();
  });

  it('saves via PUT and calls onSaved', async () => {
    const onSaved = jest.fn();
    const testServices = coreMock.createStart();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(
      <GeneralSection
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={onSaved}
      />,
      testServices
    );

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
            traces: [],
          }),
        })
      );
    });

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId('contextDescriptionSaveButton')).not.toBeInTheDocument();
  });

  it('shows the refetched description after onSaved resolves', async () => {
    const testServices = coreMock.createStart();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    const SaveWithRefetchHarness = () => {
      const [description, setDescription] = useState('My custom description');
      const onSaved = async () => {
        setDescription('Refetched description');
      };
      return (
        <GeneralSection isLoading={false} aiIndex={{ ...aiIndex, description }} onSaved={onSaved} />
      );
    };

    renderWithProviders(<SaveWithRefetchHarness />, testServices);

    fireEvent.change(screen.getByTestId('contextDescriptionTextArea'), {
      target: { value: 'Updated description' },
    });
    fireEvent.click(screen.getByTestId('contextDescriptionSaveButton'));

    await waitFor(() => {
      expect(screen.getByTestId('contextDescriptionTextArea')).toHaveValue('Refetched description');
    });
    expect(screen.queryByTestId('contextDescriptionSaveButton')).not.toBeInTheDocument();
  });

  it('keeps text typed while onSaved is still refetching', async () => {
    const testServices = coreMock.createStart();
    testServices.http.put.mockResolvedValue({ status: 'updated' });
    let finishRefetch: () => void = () => {};
    const onSaved = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRefetch = resolve;
        })
    );

    renderWithProviders(
      <GeneralSection
        isLoading={false}
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={onSaved}
      />,
      testServices
    );

    fireEvent.change(screen.getByTestId('contextDescriptionTextArea'), {
      target: { value: 'Updated description' },
    });
    fireEvent.click(screen.getByTestId('contextDescriptionSaveButton'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('contextDescriptionTextArea')).toBeEnabled());

    fireEvent.change(screen.getByTestId('contextDescriptionTextArea'), {
      target: { value: 'Typed during refetch' },
    });
    await act(async () => {
      finishRefetch();
    });

    expect(screen.getByTestId('contextDescriptionTextArea')).toHaveValue('Typed during refetch');
  });

  it('disables Save and shows an error when over MAX_AI_INDEX_DESCRIPTION_LENGTH', () => {
    renderWithProviders(<GeneralSection isLoading={false} aiIndex={aiIndex} onSaved={jest.fn()} />);

    fireEvent.change(screen.getByTestId('contextDescriptionTextArea'), {
      target: { value: 'a'.repeat(MAX_AI_INDEX_DESCRIPTION_LENGTH + 1) },
    });

    const generalPanel = screen.getByTestId('contextAiIndexSettingsGeneral');
    expect(
      within(generalPanel).getByText(/1 character over the 2,048 character limit/)
    ).toBeInTheDocument();
    expect(screen.getByTestId('contextDescriptionSaveButton')).toBeDisabled();
  });

  it('disables the textarea for a managed AI index', () => {
    renderWithProviders(
      <GeneralSection
        isLoading={false}
        aiIndex={{ ...aiIndex, managed: true, description: 'Managed description' }}
        onSaved={jest.fn()}
      />
    );

    expect(screen.getByTestId('contextDescriptionTextArea')).toBeDisabled();
  });

  it('shows a skeleton instead of the textarea while loading', () => {
    renderWithProviders(
      <GeneralSection
        isLoading
        aiIndex={{ ...aiIndex, description: 'My custom description' }}
        onSaved={jest.fn()}
      />
    );

    expect(screen.getByTestId('contextAiIndexSettingsGeneral')).toBeInTheDocument();
    expect(screen.queryByTestId('contextDescriptionTextArea')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexSettingsGeneralLoading')).toBeInTheDocument();
  });
});
