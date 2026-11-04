/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { createDefaultUnit } from '../../../services/unit_repository';
import { CreateDestinationModal } from './create_destination_modal';

const NAME_REQUIRED = 'Enter a destination name.';
const LOGS_PATTERN_REQUIRED = 'Enter a write pattern for logs.';
const DOCS_HELP_AUTO = "Documents from _bulk sources go to the index in each request's _index";

const renderModal = () => {
  const createDestination = jest.fn();
  render(
    <I18nProvider>
      <CreateDestinationModal
        destinations={{
          createDestination,
          unitDefinition: createDefaultUnit(),
          isUnitSaving: false,
          isCreatingDestination: false,
          isCreateFailed: false,
        }}
        onClose={jest.fn()}
      />
    </I18nProvider>
  );
  return { createDestination };
};

const docsPatternsInput = async () => {
  await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomWritePatterns'));
  await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomSignal-docs'));
  return within(screen.getByTestId('streamsCreateDestination-docs-writePatterns')).getByTestId(
    'comboBoxSearchInput'
  );
};

const docsPills = () =>
  within(screen.getByTestId('streamsCreateDestination-docs-writePatterns'))
    .queryAllByTestId('euiComboBoxPill')
    .map((pill) => pill.textContent);

/** The prepend and append text around an input. */
const layoutText = (input: HTMLElement) => input.closest('.euiFormControlLayout')?.textContent;

describe('CreateDestinationModal', () => {
  it('only shows the errors of fields the user has left', async () => {
    renderModal();

    await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomWritePatterns'));
    await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomSignal-logs'));

    expect(screen.queryByText(LOGS_PATTERN_REQUIRED)).not.toBeInTheDocument();
    expect(screen.queryByText(NAME_REQUIRED)).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('streamsCreateDestination-logs-index'));
    await userEvent.tab();

    expect(screen.getByText(LOGS_PATTERN_REQUIRED)).toBeInTheDocument();
    expect(screen.queryByText(NAME_REQUIRED)).not.toBeInTheDocument();
  });

  it('submits the form values', async () => {
    const { createDestination } = renderModal();

    await userEvent.type(screen.getByTestId('streamsCreateDestinationName'), 'Prod logs');
    await userEvent.click(screen.getByTestId('streamsCreateDestinationSubmit'));

    await waitFor(() =>
      expect(createDestination).toHaveBeenCalledWith(
        expect.objectContaining({
          storageKind: 'local_elasticsearch',
          destinationName: 'Prod logs',
          elasticsearch: expect.objectContaining({ auto: true }),
        }),
        expect.anything()
      )
    );
  });

  describe('Documents', () => {
    it('explains where documents go in Auto mode', () => {
      renderModal();

      expect(screen.getByText(DOCS_HELP_AUTO, { exact: false })).toBeInTheDocument();
    });

    it('splits a pasted list into one entry per pattern and marks only the invalid one', async () => {
      renderModal();
      const input = await docsPatternsInput();

      await userEvent.click(input);
      await userEvent.paste('logs-a-*, Metrics-b-*');
      await userEvent.keyboard('{Enter}');

      expect(docsPills()).toEqual(['logs-a-*', 'Metrics-b-*']);
      expect(
        screen.getByText('Metrics-b-*: Write patterns must be lowercase.')
      ).toBeInTheDocument();
      expect(screen.queryByText('logs-a-*:', { exact: false })).not.toBeInTheDocument();
    });

    it('says how many write patterns a destination can have', async () => {
      renderModal();
      const input = await docsPatternsInput();

      await userEvent.click(input);
      await userEvent.paste(
        Array.from({ length: 33 }, (_, index) => `logs-orders${index}-*`).join(',')
      );
      await userEvent.keyboard('{Enter}');

      expect(
        screen.getByText('A destination can have at most 32 write patterns across all signals.')
      ).toBeInTheDocument();
    });

    it('saves every pasted pattern', async () => {
      const { createDestination } = renderModal();
      const input = await docsPatternsInput();

      await userEvent.click(input);
      await userEvent.paste('logs-a-*, metrics-b-*');
      await userEvent.keyboard('{Enter}');
      await userEvent.type(screen.getByTestId('streamsCreateDestinationName'), 'Central');
      await userEvent.click(screen.getByTestId('streamsCreateDestinationSubmit'));

      await waitFor(() =>
        expect(createDestination).toHaveBeenCalledWith(
          expect.objectContaining({
            elasticsearch: expect.objectContaining({
              docsWritePatterns: ['logs-a-*', 'metrics-b-*'],
            }),
          }),
          expect.anything()
        )
      );
    });

    it('adds the lowercase fix of an uppercase docs write pattern', async () => {
      renderModal();
      const input = await docsPatternsInput();

      await userEvent.type(input, 'Logs-a-*{Enter}');
      await userEvent.type(input, 'logs-a-*{Enter}');

      expect(docsPills()).toEqual(['Logs-a-*', 'logs-a-*']);
    });

    it('does not add a docs write pattern twice', async () => {
      renderModal();
      const input = await docsPatternsInput();

      await userEvent.type(input, 'logs-a-*{Enter}');
      await userEvent.type(input, 'logs-a-*{Enter}');

      expect(docsPills()).toEqual(['logs-a-*']);
    });

    it('keeps the docs index out of the shared Fixed name', async () => {
      const { createDestination } = renderModal();

      await userEvent.click(screen.getByLabelText('Fixed index per signal'));
      expect(screen.getByText('Enter a name for all OTel signals')).toBeInTheDocument();
      await userEvent.type(
        screen.getByTestId('streamsCreateDestination-docs-index'),
        'accounting-2026'
      );
      await userEvent.type(screen.getByTestId('streamsCreateDestinationIndex'), 'billing-default');
      await userEvent.click(screen.getByTestId('streamsCreateDestinationIndexNaming-perSignal'));
      await userEvent.click(screen.getByTestId('streamsCreateDestinationIndexNaming-shared'));
      await userEvent.type(screen.getByTestId('streamsCreateDestinationName'), 'Central');
      await userEvent.click(screen.getByTestId('streamsCreateDestinationSubmit'));

      await waitFor(() =>
        expect(createDestination).toHaveBeenCalledWith(
          expect.objectContaining({
            elasticsearch: expect.objectContaining({
              logsIndex: 'logs-billing-default',
              docsIndex: 'accounting-2026',
            }),
          }),
          expect.anything()
        )
      );
    });

    it('clears the docs fields when the mode, the custom switch or the docs badge changes', async () => {
      renderModal();
      const input = await docsPatternsInput();
      await userEvent.type(input, 'logs-a-*{Enter}');
      expect(docsPills()).toEqual(['logs-a-*']);

      await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomSignal-docs'));
      await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomSignal-docs'));
      expect(docsPills()).toEqual([]);

      await userEvent.type(
        within(screen.getByTestId('streamsCreateDestination-docs-writePatterns')).getByTestId(
          'comboBoxSearchInput'
        ),
        'logs-a-*{Enter}'
      );
      await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomWritePatterns'));
      await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomWritePatterns'));
      await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomSignal-docs'));
      expect(docsPills()).toEqual([]);

      await userEvent.click(screen.getByLabelText('Fixed index per signal'));
      await userEvent.type(
        screen.getByTestId('streamsCreateDestination-docs-index'),
        'accounting-2026'
      );
      await userEvent.click(screen.getByLabelText('Auto (default)'));
      await userEvent.click(screen.getByLabelText('Fixed index per signal'));
      expect(screen.getByTestId('streamsCreateDestination-docs-index')).toHaveValue('');
    });

    it('shows the Documents badge and docs fields without a prepend', async () => {
      renderModal();
      await docsPatternsInput();

      expect(screen.getByTestId('streamsCreateDestinationCustomSignal-docs')).toHaveTextContent(
        'Documents'
      );
      expect(screen.getByText('Documents write patterns')).toBeInTheDocument();
      expect(screen.getByText('Must start with logs-, metrics- or traces-.')).toBeInTheDocument();

      await userEvent.click(screen.getByLabelText('Fixed index per signal'));
      expect(screen.getByTestId('streamsCreateDestinationIndex')).toHaveAttribute(
        'aria-label',
        'Index name for all OTel signals'
      );
      await userEvent.click(screen.getByTestId('streamsCreateDestinationIndexNaming-perSignal'));

      expect(layoutText(screen.getByTestId('streamsCreateDestination-logs-index'))).toContain(
        'logs'
      );
      expect(layoutText(screen.getByTestId('streamsCreateDestination-docs-index'))).toBe('');
      expect(screen.getByText('Documents index')).toBeInTheDocument();
      expect(
        screen.getByText('Any index or data stream name. It is used as entered, with no signal', {
          exact: false,
        })
      ).toBeInTheDocument();
    });
  });
});
