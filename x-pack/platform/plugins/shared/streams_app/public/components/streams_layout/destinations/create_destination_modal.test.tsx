/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const click = (testSubject: string) => fireEvent.click(screen.getByTestId(testSubject));

const docsPatternsInput = () => {
  click('streamsCreateDestinationCustomWritePatterns');
  click('streamsCreateDestinationCustomSignal-docs');
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

const addDocsPattern = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('CreateDestinationModal', () => {
  it('only shows the errors of fields the user has left', () => {
    renderModal();

    click('streamsCreateDestinationCustomWritePatterns');
    click('streamsCreateDestinationCustomSignal-logs');

    expect(screen.queryByText(LOGS_PATTERN_REQUIRED)).not.toBeInTheDocument();
    expect(screen.queryByText(NAME_REQUIRED)).not.toBeInTheDocument();

    fireEvent.blur(screen.getByTestId('streamsCreateDestination-logs-index'));

    expect(screen.getByText(LOGS_PATTERN_REQUIRED)).toBeInTheDocument();
    expect(screen.queryByText(NAME_REQUIRED)).not.toBeInTheDocument();
  });

  it('submits the form values', async () => {
    const { createDestination } = renderModal();

    setFieldValue('streamsCreateDestinationName', 'Prod logs');
    click('streamsCreateDestinationSubmit');

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
    it('splits a pasted list into one entry per pattern and marks only the invalid one', () => {
      renderModal();

      addDocsPattern(docsPatternsInput(), 'logs-a-*, Metrics-b-*');

      expect(docsPills()).toEqual(['logs-a-*', 'Metrics-b-*']);
      expect(
        screen.getByText('Metrics-b-*: Write patterns must be lowercase.')
      ).toBeInTheDocument();
      expect(screen.queryByText('logs-a-*:', { exact: false })).not.toBeInTheDocument();
    });

    it('says how many write patterns a destination can have', () => {
      renderModal();

      addDocsPattern(
        docsPatternsInput(),
        Array.from({ length: 33 }, (_, index) => `logs-orders${index}-*`).join(',')
      );

      expect(
        screen.getByText('A destination can have at most 32 write patterns across all signals.')
      ).toBeInTheDocument();
    });

    it('adds each docs write pattern once, keeping the lowercase fix of an uppercase one', () => {
      renderModal();
      const input = docsPatternsInput();

      addDocsPattern(input, 'Logs-a-*');
      addDocsPattern(input, 'logs-a-*');
      addDocsPattern(input, 'logs-a-*');

      expect(docsPills()).toEqual(['Logs-a-*', 'logs-a-*']);
    });

    it('keeps the docs index out of the shared Fixed name', async () => {
      const { createDestination } = renderModal();

      fireEvent.click(screen.getByLabelText('Fixed index per signal'));
      expect(screen.getByText('Name all OTel signals')).toBeInTheDocument();
      setFieldValue('streamsCreateDestination-docs-index', 'accounting-2026');
      setFieldValue('streamsCreateDestinationIndex', 'billing-default');
      click('streamsCreateDestinationIndexNaming-perSignal');
      click('streamsCreateDestinationIndexNaming-shared');
      setFieldValue('streamsCreateDestinationName', 'Central');
      click('streamsCreateDestinationSubmit');

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

    it('clears the docs write patterns when the docs badge is turned off', () => {
      renderModal();
      addDocsPattern(docsPatternsInput(), 'logs-a-*');
      expect(docsPills()).toEqual(['logs-a-*']);

      click('streamsCreateDestinationCustomSignal-docs');
      click('streamsCreateDestinationCustomSignal-docs');

      expect(docsPills()).toEqual([]);
    });

    it('clears the docs write patterns when the custom switch is turned off', () => {
      renderModal();
      addDocsPattern(docsPatternsInput(), 'logs-a-*');

      click('streamsCreateDestinationCustomWritePatterns');
      click('streamsCreateDestinationCustomWritePatterns');
      click('streamsCreateDestinationCustomSignal-docs');

      expect(docsPills()).toEqual([]);
    });

    it('clears the docs index when the mode changes', () => {
      renderModal();
      fireEvent.click(screen.getByLabelText('Fixed index per signal'));
      setFieldValue('streamsCreateDestination-docs-index', 'accounting-2026');

      fireEvent.click(screen.getByLabelText('Auto (default)'));
      fireEvent.click(screen.getByLabelText('Fixed index per signal'));

      expect(screen.getByTestId('streamsCreateDestination-docs-index')).toHaveValue('');
    });
  });

  describe('remote Elasticsearch', () => {
    const ENDPOINT_REQUIRED = 'Enter the endpoint of the remote cluster.';
    const API_KEY_REQUIRED = 'Enter an API key.';

    it('only shows connection errors after their input is left', () => {
      renderModal();
      click('streamsCreateDestinationRemoteElasticsearch');

      expect(screen.queryByText(ENDPOINT_REQUIRED)).not.toBeInTheDocument();

      fireEvent.blur(screen.getByTestId('streamsCreateDestinationRemoteElasticsearchEndpoint'));

      expect(screen.getByText(ENDPOINT_REQUIRED)).toBeInTheDocument();
      expect(screen.queryByText(API_KEY_REQUIRED)).not.toBeInTheDocument();
    });

    it('submits the remote form values', async () => {
      const { createDestination } = renderModal();
      click('streamsCreateDestinationRemoteElasticsearch');
      fireEvent.click(
        within(screen.getByTestId('streamsCreateDestinationFixedIndex')).getByRole('radio')
      );
      setFieldValue('streamsCreateDestinationIndex', 'shared-idx');
      setFieldValue('streamsCreateDestination-docs-index', 'accounting-2026');
      setFieldValue(
        'streamsCreateDestinationRemoteElasticsearchEndpoint',
        'https://es.example.com:443'
      );
      setFieldValue('streamsCreateDestinationRemoteElasticsearchApiKey', 'remote-key');
      setFieldValue('streamsCreateDestinationName', 'Central');
      click('streamsCreateDestinationSubmit');

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
              docsIndex: 'accounting-2026',
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
