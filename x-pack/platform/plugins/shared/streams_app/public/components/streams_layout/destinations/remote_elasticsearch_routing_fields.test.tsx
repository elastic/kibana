/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { RemoteElasticsearchRoutingFields } from './remote_elasticsearch_routing_fields';
import {
  EMPTY_DESTINATION_CREATION_FORM,
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

describe('RemoteElasticsearchRoutingFields', () => {
  it('starts in auto without write patterns or index fields', () => {
    renderRouting();

    expect(screen.getByRole('radio', { name: 'Auto (default)' })).toBeChecked();
    expect(screen.queryByTestId('streamsCreateDestinationCustomWritePatterns')).toBeNull();
    expect(screen.queryByTestId('streamsCreateDestinationIndex')).toBeNull();
  });

  it('writes one full index name to every signal, without a signal prefix', async () => {
    const { getValues } = renderRouting();

    await userEvent.click(screen.getByRole('radio', { name: 'Fixed index per signal' }));
    await userEvent.type(screen.getByTestId('streamsCreateDestinationIndex'), 'shared-idx');

    expect(getValues().remoteElasticsearch).toMatchObject({
      auto: false,
      logsIndex: 'shared-idx',
      metricsIndex: 'shared-idx',
      tracesIndex: 'shared-idx',
    });
    expect(getValues().elasticsearch).toEqual(EMPTY_DESTINATION_CREATION_FORM.elasticsearch);
  });

  it('names signals individually and copies the first filled name back to shared', async () => {
    const { getValues } = renderRouting({ initial: { auto: false } });

    await userEvent.click(screen.getByTestId('streamsCreateDestinationIndexNaming-perSignal'));
    await userEvent.type(screen.getByTestId('streamsCreateDestination-traces-index'), 'my-traces');

    expect(getValues().remoteElasticsearch).toMatchObject({
      logsIndex: '',
      metricsIndex: '',
      tracesIndex: 'my-traces',
    });

    await userEvent.click(screen.getByTestId('streamsCreateDestinationIndexNaming-shared'));

    expect(screen.getByTestId('streamsCreateDestinationIndex')).toHaveValue('my-traces');
    expect(getValues().remoteElasticsearch).toMatchObject({
      logsIndex: 'my-traces',
      metricsIndex: 'my-traces',
      tracesIndex: 'my-traces',
    });
  });

  it('clears the indices and naming when switching back to auto', async () => {
    const { getValues } = renderRouting();

    await userEvent.click(screen.getByRole('radio', { name: 'Fixed index per signal' }));
    await userEvent.click(screen.getByTestId('streamsCreateDestinationIndexNaming-perSignal'));
    await userEvent.type(screen.getByTestId('streamsCreateDestination-logs-index'), 'a');
    await userEvent.click(screen.getByRole('radio', { name: 'Auto (default)' }));

    expect(getValues().remoteElasticsearch).toMatchObject({
      auto: true,
      staticNaming: 'shared',
      logsIndex: '',
      metricsIndex: '',
      tracesIndex: '',
    });
  });

  it('shows remote error text without signal patterns', () => {
    renderRouting({
      initial: { auto: false, staticNaming: 'perSignal' },
      errors: { logsIndex: 'invalidCharacter', tracesIndex: 'invalidName' },
    });

    expect(
      screen.getByText(
        'Index names cannot contain \\ / * ? " < > | , # :, whitespace, or control characters.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Enter a valid index name.')).toBeInTheDocument();
    expect(screen.queryByText(/<dataset>-<namespace>/)).toBeNull();
  });

  it('shows the required error in place of the per-signal help', () => {
    renderRouting({
      initial: { auto: false, staticNaming: 'perSignal' },
      errors: { staticIndexes: 'required' },
    });

    expect(screen.getByText('Enter at least one index.')).toBeInTheDocument();
    expect(
      screen.queryByText('Leave a signal blank to not send it to this destination.')
    ).toBeNull();
  });
});
