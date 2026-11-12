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
import { createUnitDestination, getDestinationCreateSpec } from './destination_models';
import { createRemoteElasticsearchUnitDestination } from './remote_elasticsearch_destination_models';
import {
  EMPTY_ELASTICSEARCH_DESTINATION_FORM,
  type ElasticsearchDestinationFormData,
  type PrefixedDestinationSignal,
} from './types';

const NAME_REQUIRED = 'Enter a destination name.';
const SIGNAL_NAME_REQUIRED = 'Name at least one signal.';
const HYPHEN_ERROR = 'Dataset and namespace cannot contain "-".';
const UPPERCASE_ERROR = 'Dataset and namespace must be lowercase.';
const SAVED_AS_BILLING =
  'Saved as logs-billing.otel-default, metrics-billing.otel-default and traces-billing.otel-default.';
const SHARED_DATASET = 'streamsCreateDestinationIndexDataset';
const SHARED_NAMESPACE = 'streamsCreateDestinationIndexNamespace';
const signalDataset = (signal: PrefixedDestinationSignal) =>
  `streamsCreateDestination-${signal}-indexDataset`;
const signalNamespace = (signal: PrefixedDestinationSignal) =>
  `streamsCreateDestination-${signal}-indexNamespace`;

/** The config entries the local node is saved with. */
const savedConfig = (elasticsearch: ElasticsearchDestinationFormData) =>
  createUnitDestination({
    id: 'billing',
    name: 'Billing',
    ...getDestinationCreateSpec(elasticsearch),
  }).config;

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

  it('reads each storage card description as part of its radio label', () => {
    renderModal();
    expect(
      screen.getByRole('radio', {
        name: 'Local Elasticsearch Write to indexes in this deployment. Most common',
      })
    ).toBeChecked();
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

    it('saves otel data stream names for a shared Fixed name', async () => {
      const { createDestination } = renderModal();
      chooseFixed();
      setFieldValue(SHARED_DATASET, 'billing');
      expect(screen.getByText(SAVED_AS_BILLING)).toBeInTheDocument();
      setFieldValue('streamsCreateDestinationName', 'Billing');
      click('streamsCreateDestinationSubmit');

      const elasticsearch = await submittedElasticsearch(createDestination);
      expect(elasticsearch).toEqual({
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        auto: false,
        staticNaming: 'shared',
        staticNames: {
          logs: { dataset: 'billing', namespace: 'default' },
          metrics: { dataset: 'billing', namespace: 'default' },
          traces: { dataset: 'billing', namespace: 'default' },
        },
        logsIndex: 'logs-billing.otel-default',
        metricsIndex: 'metrics-billing.otel-default',
        tracesIndex: 'traces-billing.otel-default',
      });
      expect(savedConfig(elasticsearch)).toEqual([
        { name: 'index', telemetry: ['logs'], value: 'logs-billing.otel-default' },
        { name: 'index', telemetry: ['metrics'], value: 'metrics-billing.otel-default' },
        { name: 'index', telemetry: ['traces'], value: 'traces-billing.otel-default' },
      ]);
    });

    it('shows the generic help line when the shared dataset is empty and only the error when invalid', () => {
      renderModal();
      chooseFixed();
      expect(
        screen.getByText(
          'Saved as logs-<dataset>.otel-default, metrics-<dataset>.otel-default and traces-<dataset>.otel-default.'
        )
      ).toBeInTheDocument();

      setFieldValue(SHARED_DATASET, 'Billing');
      fireEvent.blur(screen.getByTestId(SHARED_DATASET));

      expect(screen.getByText(UPPERCASE_ERROR)).toBeInTheDocument();
      expect(screen.queryByText('Saved as', { exact: false })).not.toBeInTheDocument();
    });

    it('keeps a shared dataset as typed and rejects a hyphen in it', () => {
      renderModal();
      chooseFixed();
      setFieldValue(SHARED_DATASET, 'logs-billing');
      fireEvent.blur(screen.getByTestId(SHARED_DATASET));
      setFieldValue('streamsCreateDestinationName', 'Billing');

      expect(fieldValue(SHARED_DATASET)).toBe('logs-billing');
      expect(screen.getByText('Dataset and namespace cannot contain "-".')).toBeInTheDocument();
      expect(screen.getByTestId('streamsCreateDestinationSubmit')).toBeDisabled();
    });

    it('keeps the shared dataset and namespace after switching storage away and back', () => {
      renderModal();
      chooseFixed();
      setFieldValue(SHARED_DATASET, 'billing');
      setFieldValue(SHARED_NAMESPACE, 'prod');

      click('streamsCreateDestinationRemoteElasticsearch');
      click('streamsCreateDestinationLocalElasticsearch');

      expect(fieldValue(SHARED_DATASET)).toBe('billing');
      expect(fieldValue(SHARED_NAMESPACE)).toBe('prod');
    });

    it('sends only the signals with a dataset', async () => {
      const { createDestination } = renderModal();
      chooseFixed();
      click('streamsCreateDestinationIndexNaming-perSignal');
      setFieldValue(signalNamespace('logs'), 'prod');
      setFieldValue(signalDataset('metrics'), 'app');
      setFieldValue(signalNamespace('metrics'), 'prod');
      expect(screen.getByText('Saved as metrics-app.otel-prod.')).toBeInTheDocument();
      setFieldValue('streamsCreateDestinationName', 'Billing');
      click('streamsCreateDestinationSubmit');

      const elasticsearch = await submittedElasticsearch(createDestination);
      expect(getDestinationCreateSpec(elasticsearch)).toEqual({
        signals: ['metrics'],
        indexBySignal: { metrics: 'metrics-app.otel-prod' },
        writePatternsBySignal: {},
      });
      expect(savedConfig(elasticsearch)).toEqual([
        { name: 'index', telemetry: ['metrics'], value: 'metrics-app.otel-prod' },
      ]);
    });

    it('keeps the namespace when the dataset is cleared and typed again', async () => {
      const { createDestination } = renderModal();
      chooseFixed();
      click('streamsCreateDestinationIndexNaming-perSignal');
      setFieldValue(signalNamespace('logs'), 'prod');
      setFieldValue(signalDataset('logs'), 'x');
      setFieldValue(signalDataset('logs'), '');

      expect(fieldValue(signalNamespace('logs'))).toBe('prod');
      expect(screen.queryByText('Saved as', { exact: false })).not.toBeInTheDocument();

      setFieldValue(signalDataset('logs'), 'y');
      setFieldValue('streamsCreateDestinationName', 'Billing');
      click('streamsCreateDestinationSubmit');

      const elasticsearch = await submittedElasticsearch(createDestination);
      expect(getDestinationCreateSpec(elasticsearch).indexBySignal).toEqual({
        logs: 'logs-y.otel-prod',
      });
    });

    it('shows a name error on blur, only on the row it belongs to', () => {
      renderModal();
      chooseFixed();
      click('streamsCreateDestinationIndexNaming-perSignal');
      setFieldValue(signalDataset('logs'), 'my-app');
      setFieldValue(signalDataset('metrics'), 'app');

      expect(screen.queryByText(HYPHEN_ERROR)).not.toBeInTheDocument();

      fireEvent.blur(screen.getByTestId(signalDataset('logs')));

      expect(screen.getAllByText(HYPHEN_ERROR)).toHaveLength(1);
      expect(screen.getByText('Saved as metrics-app.otel-default.')).toBeInTheDocument();
    });

    it('names each dataset and namespace input for its signal', () => {
      renderModal();
      chooseFixed();
      expect(screen.getByRole('textbox', { name: 'Dataset for all OTel signals' })).toBe(
        screen.getByTestId(SHARED_DATASET)
      );
      expect(screen.getByRole('textbox', { name: 'Namespace for all OTel signals' })).toBe(
        screen.getByTestId(SHARED_NAMESPACE)
      );

      click('streamsCreateDestinationIndexNaming-perSignal');
      expect(screen.getByRole('textbox', { name: 'Traces dataset' })).toBe(
        screen.getByTestId(signalDataset('traces'))
      );
      expect(screen.getByRole('textbox', { name: 'Traces namespace' })).toBe(
        screen.getByTestId(signalNamespace('traces'))
      );
    });

    it('resets the signal fields when per-signal names disagree', () => {
      renderModal();
      chooseFixed();
      setFieldValue(SHARED_DATASET, 'a');
      click('streamsCreateDestinationIndexNaming-perSignal');
      setFieldValue(signalDataset('metrics'), 'c');
      click('streamsCreateDestinationIndexNaming-shared');

      expect(fieldValue(SHARED_DATASET)).toBe('');
      expect(fieldValue(SHARED_NAMESPACE)).toBe('default');

      click('streamsCreateDestinationIndexNaming-perSignal');
      expect(fieldValue(signalDataset('logs'))).toBe('');
      expect(fieldValue(signalDataset('metrics'))).toBe('');
      expect(fieldValue(signalDataset('traces'))).toBe('');
    });

    it('resets the signal fields when per-signal namespaces disagree', () => {
      renderModal();
      chooseFixed();
      click('streamsCreateDestinationIndexNaming-perSignal');
      setFieldValue(signalDataset('logs'), 'a');
      setFieldValue(signalDataset('traces'), 'a');
      setFieldValue(signalNamespace('traces'), 'prod');
      click('streamsCreateDestinationIndexNaming-shared');

      expect(fieldValue(SHARED_DATASET)).toBe('');
      expect(fieldValue(SHARED_NAMESPACE)).toBe('default');
    });

    it('names all three signals when one per-signal name moves to shared', () => {
      renderModal();
      chooseFixed();
      click('streamsCreateDestinationIndexNaming-perSignal');
      setFieldValue(signalDataset('logs'), 'a');
      setFieldValue(signalNamespace('logs'), 'prod');
      click('streamsCreateDestinationIndexNaming-shared');

      expect(fieldValue(SHARED_DATASET)).toBe('a');
      expect(fieldValue(SHARED_NAMESPACE)).toBe('prod');
      expect(
        screen.getByText('Saved as logs-a.otel-prod, metrics-a.otel-prod and traces-a.otel-prod.')
      ).toBeInTheDocument();

      click('streamsCreateDestinationIndexNaming-perSignal');
      expect(fieldValue(signalDataset('metrics'))).toBe('a');
      expect(fieldValue(signalNamespace('traces'))).toBe('prod');
    });

    it('resets the Fixed names when the mode changes and back', () => {
      renderModal();
      chooseFixed();
      setFieldValue(SHARED_DATASET, 'billing');
      setFieldValue(SHARED_NAMESPACE, 'prod');
      chooseAutomatic();
      useCustomIndexNames();

      expect(fieldValue('streamsCreateDestination-logs-index')).toBe('');

      chooseFixed();
      expect(fieldValue(SHARED_DATASET)).toBe('');
      expect(fieldValue(SHARED_NAMESPACE)).toBe('default');
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
      expect(screen.getByTestId(SHARED_DATASET)).toBeInTheDocument();
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
      setFieldValue(SHARED_DATASET, 'billing');
      click('streamsCreateDestinationIndexNaming-perSignal');
      click('streamsCreateDestinationIndexNaming-shared');
      setFieldValue('streamsCreateDestinationName', 'Central');
      click('streamsCreateDestinationSubmit');

      await waitFor(() =>
        expect(createDestination).toHaveBeenCalledWith(
          expect.objectContaining({
            elasticsearch: expect.objectContaining({
              logsIndex: 'logs-billing.otel-default',
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

    const chooseRemoteFixed = () => {
      click('streamsCreateDestinationRemoteElasticsearch');
      fireEvent.click(
        within(screen.getByTestId('streamsCreateDestinationFixedIndex')).getByRole('radio')
      );
      setFieldValue(
        'streamsCreateDestinationRemoteElasticsearchEndpoint',
        'https://es.example.com:443'
      );
      setFieldValue('streamsCreateDestinationRemoteElasticsearchApiKey', 'remote-key');
      setFieldValue('streamsCreateDestinationName', 'Central');
    };

    it('saves one telemetry-scoped otel index per signal for a shared Fixed name', async () => {
      const { createDestination } = renderModal();
      chooseRemoteFixed();
      setFieldValue(SHARED_DATASET, 'billing');
      expect(screen.getByText(SAVED_AS_BILLING)).toBeInTheDocument();
      expect(
        screen.getByTestId('streamsCreateDestinationRemoteElasticsearchApiKey')
      ).toHaveAttribute('type', 'password');
      click('streamsCreateDestinationSubmit');

      await waitFor(() => expect(createDestination).toHaveBeenCalled());
      const formData = createDestination.mock.calls[0][0];
      expect(formData).toMatchObject({
        storageKind: 'remote_elasticsearch',
        destinationName: 'Central',
        remoteElasticsearch: {
          auto: false,
          logsIndex: 'logs-billing.otel-default',
          metricsIndex: 'metrics-billing.otel-default',
          tracesIndex: 'traces-billing.otel-default',
          endpoint: 'https://es.example.com:443',
          apiKey: 'remote-key',
        },
      });
      const node = createRemoteElasticsearchUnitDestination({
        id: 'central',
        name: 'Central',
        ...formData.remoteElasticsearch,
      });
      expect(node.config?.filter(({ name }) => name === 'index')).toEqual([
        { name: 'index', value: 'logs-billing.otel-default', telemetry: ['logs'] },
        { name: 'index', value: 'metrics-billing.otel-default', telemetry: ['metrics'] },
        { name: 'index', value: 'traces-billing.otel-default', telemetry: ['traces'] },
      ]);
    });

    it('shows a remote name error on blur and does not save', async () => {
      const { createDestination } = renderModal();
      chooseRemoteFixed();
      click('streamsCreateDestinationIndexNaming-perSignal');
      setFieldValue(signalDataset('traces'), 'Bad');

      expect(screen.queryByText(UPPERCASE_ERROR)).not.toBeInTheDocument();

      fireEvent.blur(screen.getByTestId(signalDataset('traces')));

      expect(screen.getByText(UPPERCASE_ERROR)).toBeInTheDocument();
      click('streamsCreateDestinationSubmit');
      await waitFor(() => expect(screen.getByText(UPPERCASE_ERROR)).toBeInTheDocument());
      expect(createDestination).not.toHaveBeenCalled();
    });
  });

  describe('step dots', () => {
    it('keeps every step in the default style while fields are empty', () => {
      renderModal();
      chooseFixed();
      expect(screen.queryAllByText(/Step \d is incomplete/)).toHaveLength(0);
    });
  });
});
