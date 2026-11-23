/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { createDefaultUnit } from '../../../services/unit_repository';
import { CreateSourceModal } from './create_source_modal';
import { selectableSignalsForSourceType } from './source_models';
import type { SourceType } from './types';

const NAME_REQUIRED = 'Enter a source name.';
const NAME_DUPLICATE = 'A source with this name already exists.';
const SIGNALS_REQUIRED = 'Select at least one signal.';
const DEFAULT_UNIT_SOURCE_NAME = 'Nop';

const renderModal = (availableSourceTypes: SourceType[] = ['otlp']) => {
  const createSource = jest.fn();
  render(
    <I18nProvider>
      <CreateSourceModal
        sources={{
          createSource,
          unitDefinition: createDefaultUnit(),
          availableSourceTypes,
          isUnitSaving: false,
          isGeneratingApiKey: false,
          isCreatingSource: false,
          isSavingSource: false,
          isCreateFailed: false,
        }}
        onClose={jest.fn()}
      />
    </I18nProvider>
  );
  return { createSource };
};

describe('CreateSourceModal', () => {
  it('shows the name error once the name was left', async () => {
    renderModal();

    expect(screen.queryByText(NAME_REQUIRED)).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('streamsSourceNameInput'));
    await userEvent.tab();

    expect(screen.getByText(NAME_REQUIRED)).toBeInTheDocument();
  });

  it('shows the signals error once every signal is cleared', async () => {
    renderModal();

    for (const signal of selectableSignalsForSourceType('otlp')) {
      await userEvent.click(screen.getByTestId(`streamsSourceSignal-${signal}`));
    }

    expect(screen.getByText(SIGNALS_REQUIRED)).toBeInTheDocument();
    expect(screen.queryByText(NAME_REQUIRED)).not.toBeInTheDocument();
  });

  it('submits the form values', async () => {
    const { createSource } = renderModal();

    await userEvent.type(screen.getByTestId('streamsSourceNameInput'), 'Edge');
    await userEvent.click(screen.getByTestId('streamsCreateSourceContinueButton'));

    await waitFor(() =>
      expect(createSource).toHaveBeenCalledWith(
        {
          sourceType: 'otlp',
          sourceName: 'Edge',
          signals: selectableSignalsForSourceType('otlp'),
        },
        expect.anything()
      )
    );
  });

  it('creates a Managed _bulk source without a signal choice', async () => {
    const { createSource } = renderModal(['async_bulk']);

    expect(screen.queryByTestId('streamsSourceSignal-logs')).not.toBeInTheDocument();

    await userEvent.type(screen.getByTestId('streamsSourceNameInput'), 'Orders');
    await userEvent.click(screen.getByTestId('streamsCreateSourceContinueButton'));

    await waitFor(() =>
      expect(createSource).toHaveBeenCalledWith(
        { sourceType: 'async_bulk', sourceName: 'Orders', signals: [] },
        expect.anything()
      )
    );
  });

  it('shows a duplicate name error while the name is still being typed', () => {
    renderModal();
    const setSourceName = (value: string) =>
      fireEvent.change(screen.getByTestId('streamsSourceNameInput'), { target: { value } });

    setSourceName(DEFAULT_UNIT_SOURCE_NAME);

    expect(screen.getByText(NAME_DUPLICATE)).toBeInTheDocument();
    expect(screen.getByTestId('streamsCreateSourceContinueButton')).toBeDisabled();

    setSourceName('Edge');

    expect(screen.queryByText(NAME_DUPLICATE)).not.toBeInTheDocument();
    expect(screen.getByTestId('streamsCreateSourceContinueButton')).toBeEnabled();
  });
});
