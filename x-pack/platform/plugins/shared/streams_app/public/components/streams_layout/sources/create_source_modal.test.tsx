/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { createDefaultUnit } from '../../../services/unit_repository';
import { CreateSourceModal } from './create_source_modal';
import { selectableSignalsForSourceType } from './source_models';

const NAME_REQUIRED = 'Enter a source name.';
const SIGNALS_REQUIRED = 'Select at least one signal.';

const renderModal = () => {
  const createSource = jest.fn();
  render(
    <I18nProvider>
      <CreateSourceModal
        sources={{
          createSource,
          unitDefinition: createDefaultUnit(),
          availableSourceTypes: ['otlp'],
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
});
