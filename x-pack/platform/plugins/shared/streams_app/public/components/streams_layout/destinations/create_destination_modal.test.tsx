/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { createDefaultUnit } from '../../../services/unit_repository';
import { CreateDestinationModal } from './create_destination_modal';

const NAME_REQUIRED = 'Enter a destination name.';
const LOGS_PATTERN_REQUIRED = 'Enter a write pattern for logs.';

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

const setFieldValue = (testSubject: string, value: string) =>
  fireEvent.change(screen.getByTestId(testSubject), { target: { value } });

const addDocsPattern = async (input: HTMLElement, value: string) => {
  await userEvent.click(input);
  await userEvent.paste(value);
  await userEvent.keyboard('{Enter}');
};

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

    it('adds each docs write pattern once, keeping the lowercase fix of an uppercase one', async () => {
      renderModal();
      const input = await docsPatternsInput();

      await addDocsPattern(input, 'Logs-a-*');
      await addDocsPattern(input, 'logs-a-*');
      await addDocsPattern(input, 'logs-a-*');

      expect(docsPills()).toEqual(['Logs-a-*', 'logs-a-*']);
    });

    it('keeps the docs index out of the shared Fixed name', async () => {
      const { createDestination } = renderModal();

      await userEvent.click(screen.getByLabelText('Fixed index per signal'));
      expect(screen.getByText('Name all OTel signals')).toBeInTheDocument();
      setFieldValue('streamsCreateDestination-docs-index', 'accounting-2026');
      setFieldValue('streamsCreateDestinationIndex', 'billing-default');
      await userEvent.click(screen.getByTestId('streamsCreateDestinationIndexNaming-perSignal'));
      await userEvent.click(screen.getByTestId('streamsCreateDestinationIndexNaming-shared'));
      setFieldValue('streamsCreateDestinationName', 'Central');
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

    it('clears the docs write patterns when the docs badge is turned off', async () => {
      renderModal();
      await addDocsPattern(await docsPatternsInput(), 'logs-a-*');
      expect(docsPills()).toEqual(['logs-a-*']);

      await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomSignal-docs'));
      await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomSignal-docs'));

      expect(docsPills()).toEqual([]);
    });

    it('clears the docs write patterns when the custom switch is turned off', async () => {
      renderModal();
      await addDocsPattern(await docsPatternsInput(), 'logs-a-*');

      await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomWritePatterns'));
      await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomWritePatterns'));
      await userEvent.click(screen.getByTestId('streamsCreateDestinationCustomSignal-docs'));

      expect(docsPills()).toEqual([]);
    });

    it('clears the docs index when the mode changes', async () => {
      renderModal();
      await userEvent.click(screen.getByLabelText('Fixed index per signal'));
      setFieldValue('streamsCreateDestination-docs-index', 'accounting-2026');

      await userEvent.click(screen.getByLabelText('Auto (default)'));
      await userEvent.click(screen.getByLabelText('Fixed index per signal'));

      expect(screen.getByTestId('streamsCreateDestination-docs-index')).toHaveValue('');
    });
  });

  describe('remote Elasticsearch', () => {
    const ENDPOINT_REQUIRED = 'Enter the endpoint of the remote cluster.';
    const API_KEY_REQUIRED = 'Enter an API key.';

    it('only shows connection errors after their input is left', async () => {
      renderModal();
      await userEvent.click(screen.getByTestId('streamsCreateDestinationRemoteElasticsearch'));

      expect(screen.queryByText(ENDPOINT_REQUIRED)).not.toBeInTheDocument();

      await userEvent.click(
        screen.getByTestId('streamsCreateDestinationRemoteElasticsearchEndpoint')
      );
      await userEvent.tab();

      expect(screen.getByText(ENDPOINT_REQUIRED)).toBeInTheDocument();
      expect(screen.queryByText(API_KEY_REQUIRED)).not.toBeInTheDocument();
    });

    it('submits the remote form values', async () => {
      const { createDestination } = renderModal();
      await userEvent.click(screen.getByTestId('streamsCreateDestinationRemoteElasticsearch'));
      await userEvent.click(
        within(screen.getByTestId('streamsCreateDestinationFixedIndex')).getByRole('radio')
      );
      setFieldValue('streamsCreateDestinationIndex', 'shared-idx');
      setFieldValue(
        'streamsCreateDestinationRemoteElasticsearchEndpoint',
        'https://es.example.com:443'
      );
      setFieldValue('streamsCreateDestinationRemoteElasticsearchApiKey', 'remote-key');
      setFieldValue('streamsCreateDestinationName', 'Central');
      await userEvent.click(screen.getByTestId('streamsCreateDestinationSubmit'));

      await waitFor(() =>
        expect(createDestination).toHaveBeenCalledWith(
          expect.objectContaining({
            storageKind: 'remote_elasticsearch',
            destinationName: 'Central',
            remoteElasticsearch: expect.objectContaining({
              auto: false,
              logsIndex: 'shared-idx',
              metricsIndex: 'shared-idx',
              tracesIndex: 'shared-idx',
              endpoint: 'https://es.example.com:443',
              apiKey: 'remote-key',
            }),
          }),
          expect.anything()
        )
      );
    });
  });
});
