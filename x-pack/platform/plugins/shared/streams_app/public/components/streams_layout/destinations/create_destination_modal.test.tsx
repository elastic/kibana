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
import { getDestinationCreateSpec } from './destination_models';
import { EMPTY_ELASTICSEARCH_DESTINATION_FORM } from './types';

const NAME_REQUIRED = 'Enter a destination name.';
const SIGNAL_NAME_REQUIRED = 'Name at least one signal.';

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

const docsPatternsInput = () =>
  within(screen.getByTestId('streamsCreateDestination-docs-writePatterns')).getByTestId(
    'comboBoxSearchInput'
  );

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

const useCustomIndexNames = () => click('streamsCreateDestinationCustomWritePatterns');
const chooseFixed = () => fireEvent.click(screen.getByLabelText('Fixed index per signal'));
const chooseAutomatic = () => fireEvent.click(screen.getByLabelText('Automatic'));
const fieldValue = (testSubject: string) =>
  (screen.getByTestId(testSubject) as HTMLInputElement).value;

const submittedElasticsearch = async (createDestination: jest.Mock) => {
  await waitFor(() => expect(createDestination).toHaveBeenCalled());
  return createDestination.mock.calls[0][0].elasticsearch;
};

describe('CreateDestinationModal', () => {
  it('only shows the errors of fields the user has left', () => {
    renderModal();

    useCustomIndexNames();

    expect(screen.queryByText(SIGNAL_NAME_REQUIRED)).not.toBeInTheDocument();
    expect(screen.queryByText(NAME_REQUIRED)).not.toBeInTheDocument();

    fireEvent.blur(screen.getByTestId('streamsCreateDestination-logs-index'));

    expect(screen.getByText(SIGNAL_NAME_REQUIRED)).toBeInTheDocument();
    expect(screen.queryByText(NAME_REQUIRED)).not.toBeInTheDocument();
  });

  it('names the details fields by their labels and describes Name by its help text', () => {
    renderModal();
    const name = screen.getByRole('textbox', { name: 'Name' });
    expect(name).toBe(screen.getByTestId('streamsCreateDestinationName'));
    expect(name).toHaveAccessibleDescription(
      "Permanent once created. Destinations can't be renamed."
    );
    expect(screen.getByRole('textbox', { name: /^Description/ })).toBe(
      screen.getByTestId('streamsCreateDestinationDescription')
    );
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

  describe('local writing mode', () => {
    it('submits Automatic custom with signals derived from filled fields', async () => {
      const { createDestination } = renderModal();
      useCustomIndexNames();
      setFieldValue('streamsCreateDestination-logs-index', 'logs-billing-*');
      addDocsPattern(docsPatternsInput(), 'logs-orders-*');
      setFieldValue('streamsCreateDestinationName', 'Billing');
      click('streamsCreateDestinationSubmit');

      const elasticsearch = await submittedElasticsearch(createDestination);
      expect(elasticsearch).toEqual({
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        auto: true,
        useCustomWritePatterns: true,
        customSignals: ['logs', 'docs'],
        logsIndex: 'logs-billing-*',
        docsWritePatterns: ['logs-orders-*'],
      });
      expect(getDestinationCreateSpec(elasticsearch)).toEqual({
        signals: ['logs', 'docs'],
        indexBySignal: {},
        writePatternsBySignal: { logs: ['logs-billing-*'], docs: ['logs-orders-*'] },
      });
    });

    it('submits Fixed shared as three composed indices and shows them in the help line', async () => {
      const { createDestination } = renderModal();
      chooseFixed();
      setFieldValue('streamsCreateDestinationIndex', 'billing-default');
      expect(
        screen.getByText(
          'Saved as logs-billing-default, metrics-billing-default and traces-billing-default.'
        )
      ).toBeInTheDocument();
      setFieldValue('streamsCreateDestinationName', 'Billing');
      click('streamsCreateDestinationSubmit');

      const elasticsearch = await submittedElasticsearch(createDestination);
      expect(elasticsearch).toEqual({
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        auto: false,
        staticNaming: 'shared',
        logsIndex: 'logs-billing-default',
        metricsIndex: 'metrics-billing-default',
        tracesIndex: 'traces-billing-default',
      });
      expect(getDestinationCreateSpec(elasticsearch)).toEqual({
        signals: ['logs', 'metrics', 'traces'],
        indexBySignal: {
          logs: 'logs-billing-default',
          metrics: 'metrics-billing-default',
          traces: 'traces-billing-default',
        },
        writePatternsBySignal: {},
      });
    });

    it('shows the generic help line when the shared field is empty and only the error when invalid', () => {
      renderModal();
      chooseFixed();
      expect(
        screen.getByText('Saved as logs-<name>, metrics-<name> and traces-<name>.')
      ).toBeInTheDocument();

      setFieldValue('streamsCreateDestinationIndex', 'Billing');
      fireEvent.blur(screen.getByTestId('streamsCreateDestinationIndex'));

      expect(screen.getByText('Index names must be lowercase.')).toBeInTheDocument();
      expect(screen.queryByText('Saved as', { exact: false })).not.toBeInTheDocument();
    });

    it('keeps a shared name typed with a signal prefix as typed and asks to drop the prefix', () => {
      renderModal();
      chooseFixed();
      setFieldValue('streamsCreateDestinationIndex', 'logs-');
      expect(fieldValue('streamsCreateDestinationIndex')).toBe('logs-');

      setFieldValue('streamsCreateDestinationIndex', 'logs-billing-default');
      fireEvent.blur(screen.getByTestId('streamsCreateDestinationIndex'));
      setFieldValue('streamsCreateDestinationName', 'Billing');

      expect(fieldValue('streamsCreateDestinationIndex')).toBe('logs-billing-default');
      expect(
        screen.getByText('Enter the name without the logs-, metrics- or traces- prefix.')
      ).toBeInTheDocument();
      expect(screen.getByTestId('streamsCreateDestinationSubmit')).toBeDisabled();
    });

    it('keeps a shared name typed with a signal prefix after switching storage away and back', () => {
      renderModal();
      chooseFixed();
      setFieldValue('streamsCreateDestinationIndex', 'logs-billing-default');

      click('streamsCreateDestinationRemoteElasticsearch');
      click('streamsCreateDestinationLocalElasticsearch');

      expect(fieldValue('streamsCreateDestinationIndex')).toBe('logs-billing-default');
    });

    it('submits Fixed per signal with full names as typed', async () => {
      const { createDestination } = renderModal();
      chooseFixed();
      click('streamsCreateDestinationIndexNaming-perSignal');
      setFieldValue('streamsCreateDestination-logs-index', 'logs-billing-default');
      setFieldValue('streamsCreateDestination-traces-index', 'traces-billing-default');
      setFieldValue('streamsCreateDestinationName', 'Billing');
      click('streamsCreateDestinationSubmit');

      const elasticsearch = await submittedElasticsearch(createDestination);
      expect(elasticsearch).toEqual({
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        auto: false,
        staticNaming: 'perSignal',
        logsIndex: 'logs-billing-default',
        tracesIndex: 'traces-billing-default',
      });
      expect(getDestinationCreateSpec(elasticsearch)).toEqual({
        signals: ['logs', 'traces'],
        indexBySignal: { logs: 'logs-billing-default', traces: 'traces-billing-default' },
        writePatternsBySignal: {},
      });
    });

    it('resets the signal fields when per-signal names disagree', () => {
      renderModal();
      chooseFixed();
      setFieldValue('streamsCreateDestinationIndex', 'a-b');
      click('streamsCreateDestinationIndexNaming-perSignal');
      setFieldValue('streamsCreateDestination-metrics-index', 'metrics-c-d');
      click('streamsCreateDestinationIndexNaming-shared');

      expect(fieldValue('streamsCreateDestinationIndex')).toBe('');

      click('streamsCreateDestinationIndexNaming-perSignal');
      expect(fieldValue('streamsCreateDestination-logs-index')).toBe('');
      expect(fieldValue('streamsCreateDestination-metrics-index')).toBe('');
      expect(fieldValue('streamsCreateDestination-traces-index')).toBe('');
    });

    it('composes all three indices when one per-signal name moves to shared', () => {
      renderModal();
      chooseFixed();
      click('streamsCreateDestinationIndexNaming-perSignal');
      setFieldValue('streamsCreateDestination-logs-index', 'logs-a-b');
      click('streamsCreateDestinationIndexNaming-shared');

      expect(fieldValue('streamsCreateDestinationIndex')).toBe('a-b');
      expect(
        screen.getByText('Saved as logs-a-b, metrics-a-b and traces-a-b.')
      ).toBeInTheDocument();

      click('streamsCreateDestinationIndexNaming-perSignal');
      expect(fieldValue('streamsCreateDestination-metrics-index')).toBe('metrics-a-b');
      expect(fieldValue('streamsCreateDestination-traces-index')).toBe('traces-a-b');
    });

    it('resets the custom switch and naming when the mode changes', () => {
      renderModal();
      useCustomIndexNames();
      setFieldValue('streamsCreateDestination-logs-index', 'logs-a-*');
      chooseFixed();
      click('streamsCreateDestinationIndexNaming-perSignal');
      chooseAutomatic();

      expect(screen.getByTestId('streamsCreateDestinationCustomWritePatterns')).toHaveAttribute(
        'aria-checked',
        'false'
      );

      useCustomIndexNames();
      expect(fieldValue('streamsCreateDestination-logs-index')).toBe('');

      chooseFixed();
      expect(screen.getByTestId('streamsCreateDestinationIndex')).toBeInTheDocument();
    });
  });

  describe('Documents', () => {
    it('splits a pasted list into one entry per pattern and marks only the invalid one', () => {
      renderModal();
      useCustomIndexNames();

      addDocsPattern(docsPatternsInput(), 'logs-a-*, Metrics-b-*');

      expect(docsPills()).toEqual(['logs-a-*', 'Metrics-b-*']);
      expect(
        screen.getByText('Metrics-b-*: Write patterns must be lowercase.')
      ).toBeInTheDocument();
      expect(screen.queryByText('logs-a-*:', { exact: false })).not.toBeInTheDocument();
    });

    it('says how many write patterns a destination can have', () => {
      renderModal();
      useCustomIndexNames();

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
      useCustomIndexNames();
      const input = docsPatternsInput();

      addDocsPattern(input, 'Logs-a-*');
      addDocsPattern(input, 'logs-a-*');
      addDocsPattern(input, 'logs-a-*');

      expect(docsPills()).toEqual(['Logs-a-*', 'logs-a-*']);
    });

    it('keeps the docs index out of the shared Fixed name', async () => {
      const { createDestination } = renderModal();

      fireEvent.click(screen.getByLabelText('Fixed index per signal'));
      expect(screen.getByText('One name for all signals')).toBeInTheDocument();
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

    it('clears the docs write patterns when the custom switch is turned off', () => {
      renderModal();
      useCustomIndexNames();
      addDocsPattern(docsPatternsInput(), 'logs-a-*');
      expect(docsPills()).toEqual(['logs-a-*']);

      useCustomIndexNames();
      useCustomIndexNames();

      expect(docsPills()).toEqual([]);
    });

    it('clears the docs index when the mode changes', () => {
      renderModal();
      fireEvent.click(screen.getByLabelText('Fixed index per signal'));
      setFieldValue('streamsCreateDestination-docs-index', 'accounting-2026');

      fireEvent.click(screen.getByLabelText('Automatic'));
      fireEvent.click(screen.getByLabelText('Fixed index per signal'));

      expect(screen.getByTestId('streamsCreateDestination-docs-index')).toHaveValue('');
    });
  });

  describe('external storage', () => {
    it('submits the S3 form values and masks the secret access key', async () => {
      const { createDestination } = renderModal();
      click('streamsCreateDestinationExternalStorage');

      setFieldValue('streamsCreateDestinationS3Region', 'us-east-1');
      setFieldValue('streamsCreateDestinationS3Bucket', 'my-bucket');
      setFieldValue('streamsCreateDestinationS3AccessKeyId', 'AKIA');
      setFieldValue('streamsCreateDestinationS3SecretAccessKey', 'shh');
      expect(screen.getByTestId('streamsCreateDestinationS3SecretAccessKey')).toHaveAttribute(
        'type',
        'password'
      );
      setFieldValue('streamsCreateDestinationName', 'Archive');
      click('streamsCreateDestinationSubmit');

      await waitFor(() =>
        expect(createDestination).toHaveBeenCalledWith(
          expect.objectContaining({
            storageKind: 'external_storage',
            destinationName: 'Archive',
            s3: {
              region: 'us-east-1',
              bucket: 'my-bucket',
              prefix: '',
              accessKeyId: 'AKIA',
              secretAccessKey: 'shh',
            },
          }),
          expect.anything()
        )
      );
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
      setFieldValue(
        'streamsCreateDestinationRemoteElasticsearchEndpoint',
        'https://es.example.com:443'
      );
      setFieldValue('streamsCreateDestinationRemoteElasticsearchApiKey', 'remote-key');
      expect(
        screen.getByTestId('streamsCreateDestinationRemoteElasticsearchApiKey')
      ).toHaveAttribute('type', 'password');
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
              endpoint: 'https://es.example.com:443',
              apiKey: 'remote-key',
            }),
          }),
          expect.anything()
        )
      );
    });
  });

  describe('step dots', () => {
    const incomplete = (step: number) => screen.queryByText(`Step ${step} is incomplete`);

    it('fills the local steps once their fields are valid', () => {
      renderModal();
      expect(incomplete(1)).not.toBeInTheDocument();
      expect(incomplete(2)).not.toBeInTheDocument();
      expect(incomplete(3)).toBeInTheDocument();

      chooseFixed();
      expect(incomplete(2)).toBeInTheDocument();
      setFieldValue('streamsCreateDestinationIndex', 'billing-default');
      expect(incomplete(2)).not.toBeInTheDocument();

      setFieldValue('streamsCreateDestinationName', 'Billing');
      expect(incomplete(3)).not.toBeInTheDocument();
    });
  });
});
