/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RemoteElasticsearchRoutingFields } from './remote_elasticsearch_routing_fields';
import {
  EMPTY_DESTINATION_CREATION_FORM,
  EMPTY_STATIC_NAMES,
  type DestinationCreationFormData,
  type DestinationCreationFormErrors,
  type RemoteElasticsearchDestinationFormData,
} from './types';

const renderRouting = ({
  initial = {},
  errors = {},
}: {
  initial?: Partial<RemoteElasticsearchDestinationFormData>;
  errors?: DestinationCreationFormErrors;
} = {}) => {
  let methods: UseFormReturn<DestinationCreationFormData> | undefined;
  const Harness = () => {
    methods = useForm<DestinationCreationFormData>({
      defaultValues: {
        ...EMPTY_DESTINATION_CREATION_FORM,
        storageKind: 'remote_elasticsearch',
        remoteElasticsearch: { ...EMPTY_DESTINATION_CREATION_FORM.remoteElasticsearch, ...initial },
      },
    });
    return (
      <I18nProvider>
        <FormProvider {...methods}>
          <RemoteElasticsearchRoutingFields errors={errors} disabled={false} />
        </FormProvider>
      </I18nProvider>
    );
  };
  render(<Harness />);
  const getValues = () => {
    if (!methods) {
      throw new Error('Expected the form to be rendered');
    }
    return methods.getValues();
  };
  return { getValues };
};

const click = (element: HTMLElement) => fireEvent.click(element);
const setFieldValue = (testSubject: string, value: string) =>
  fireEvent.change(screen.getByTestId(testSubject), { target: { value } });

describe('RemoteElasticsearchRoutingFields', () => {
  it('starts in auto without write patterns or index fields', () => {
    renderRouting();

    expect(screen.getByRole('radio', { name: 'Automatic' })).toBeChecked();
    expect(screen.queryByTestId('streamsCreateDestinationCustomWritePatterns')).toBeNull();
    expect(screen.queryByTestId('streamsCreateDestinationIndexDataset')).toBeNull();
    expect(screen.queryByTestId('streamsCreateDestination-docs-index')).toBeNull();
  });

  it('keeps the docs index out of the shared name in both namings', () => {
    const { getValues } = renderRouting({ initial: { auto: false } });

    setFieldValue('streamsCreateDestinationIndexDataset', 'billing');
    expect(screen.getByTestId('streamsCreateDestination-docs-index')).toHaveValue('');
    setFieldValue('streamsCreateDestination-docs-index', 'accounting-2026');
    click(screen.getByTestId('streamsCreateDestinationIndexNaming-perSignal'));

    expect(screen.getByTestId('streamsCreateDestination-docs-index')).toHaveValue(
      'accounting-2026'
    );
    click(screen.getByTestId('streamsCreateDestinationIndexNaming-shared'));

    expect(screen.getByTestId('streamsCreateDestination-docs-index')).toHaveValue(
      'accounting-2026'
    );
    expect(getValues().remoteElasticsearch).toMatchObject({
      logsIndex: 'logs-billing.otel-default',
      metricsIndex: 'metrics-billing.otel-default',
      tracesIndex: 'traces-billing.otel-default',
      docsIndex: 'accounting-2026',
    });
  });

  it('shows the docs index error', () => {
    renderRouting({ initial: { auto: false }, errors: { docsIndex: 'uppercase' } });

    expect(screen.getByTestId('streamsCreateDestination-docs-index')).toBeInvalid();
  });

  it('writes the shared dataset and namespace to every signal as otel names', () => {
    const { getValues } = renderRouting();

    click(screen.getByRole('radio', { name: 'Fixed index per signal' }));
    setFieldValue('streamsCreateDestinationIndexDataset', 'billing');
    setFieldValue('streamsCreateDestinationIndexNamespace', 'prod');

    expect(getValues().remoteElasticsearch).toMatchObject({
      auto: false,
      staticNames: {
        logs: { dataset: 'billing', namespace: 'prod' },
        metrics: { dataset: 'billing', namespace: 'prod' },
        traces: { dataset: 'billing', namespace: 'prod' },
      },
      logsIndex: 'logs-billing.otel-prod',
      metricsIndex: 'metrics-billing.otel-prod',
      tracesIndex: 'traces-billing.otel-prod',
    });
    expect(
      screen.getByText(
        'Saved as logs-billing.otel-prod, metrics-billing.otel-prod and traces-billing.otel-prod. Prometheus remote write metrics go to metrics-billing.prometheus-prod.'
      )
    ).toBeInTheDocument();
    expect(getValues().elasticsearch).toEqual(EMPTY_DESTINATION_CREATION_FORM.elasticsearch);
  });

  it('names signals individually and copies a single filled name back to shared', () => {
    const { getValues } = renderRouting({ initial: { auto: false } });

    click(screen.getByTestId('streamsCreateDestinationIndexNaming-perSignal'));
    setFieldValue('streamsCreateDestination-traces-indexDataset', 'app');

    expect(getValues().remoteElasticsearch).toMatchObject({
      logsIndex: '',
      metricsIndex: '',
      tracesIndex: 'traces-app.otel-default',
    });
    expect(screen.getByText('Saved as traces-app.otel-default.')).toBeInTheDocument();

    click(screen.getByTestId('streamsCreateDestinationIndexNaming-shared'));

    expect(screen.getByTestId('streamsCreateDestinationIndexDataset')).toHaveValue('app');
    expect(getValues().remoteElasticsearch).toMatchObject({
      logsIndex: 'logs-app.otel-default',
      metricsIndex: 'metrics-app.otel-default',
      tracesIndex: 'traces-app.otel-default',
    });
  });

  it('clears the names and naming when switching back to auto', () => {
    const { getValues } = renderRouting();

    click(screen.getByRole('radio', { name: 'Fixed index per signal' }));
    click(screen.getByTestId('streamsCreateDestinationIndexNaming-perSignal'));
    setFieldValue('streamsCreateDestination-logs-indexDataset', 'a');
    setFieldValue('streamsCreateDestination-logs-indexNamespace', 'prod');
    setFieldValue('streamsCreateDestination-docs-index', 'my-docs');
    click(screen.getByRole('radio', { name: 'Automatic' }));

    expect(getValues().remoteElasticsearch).toMatchObject({
      auto: true,
      staticNaming: 'shared',
      staticNames: EMPTY_STATIC_NAMES,
      logsIndex: '',
      metricsIndex: '',
      tracesIndex: '',
      docsIndex: '',
    });
  });

  it('shows the dataset and namespace error text', () => {
    renderRouting({
      initial: { auto: false, staticNaming: 'perSignal' },
      errors: { logsIndex: 'invalidCharacter', tracesIndex: 'invalidName' },
    });

    expect(
      screen.getByText(
        'Dataset and namespace cannot contain \\ / * ? " < > | , # : or spaces. Invisible characters are not allowed either.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Dataset and namespace cannot be "." or "..".')).toBeInTheDocument();
  });

  it('shows the required error in place of the per-signal help', () => {
    renderRouting({
      initial: { auto: false, staticNaming: 'perSignal' },
      errors: { staticIndexes: 'required' },
    });

    expect(screen.getByText('Enter at least one index.')).toBeInTheDocument();
    expect(screen.queryByText('Unnamed signals will be ignored and skipped.')).toBeNull();
  });

  it('resets the signal fields when per-signal names disagree', () => {
    const { getValues } = renderRouting({ initial: { auto: false } });

    click(screen.getByTestId('streamsCreateDestinationIndexNaming-perSignal'));
    setFieldValue('streamsCreateDestination-logs-indexDataset', 'a');
    setFieldValue('streamsCreateDestination-metrics-indexDataset', 'b');
    click(screen.getByTestId('streamsCreateDestinationIndexNaming-shared'));

    expect(screen.getByTestId('streamsCreateDestinationIndexDataset')).toHaveValue('');
    expect(getValues().remoteElasticsearch).toMatchObject({
      staticNames: EMPTY_STATIC_NAMES,
      logsIndex: '',
      metricsIndex: '',
      tracesIndex: '',
    });
  });
});
