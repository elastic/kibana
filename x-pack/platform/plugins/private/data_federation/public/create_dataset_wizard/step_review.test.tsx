/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';

import { I18nProvider } from '@kbn/i18n-react';
import type { DataSource } from '../../common';
import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { emptyDatasetFormValues } from './dataset_form_initial_values';
import { StepReview } from './step_review';

const dataSources: DataSource[] = [{ name: 'source-1', type: 's3', description: '', settings: {} }];

const renderStepReview = (overrides: Partial<CreateDatasetFormValues> = {}) => {
  const defaultValues: CreateDatasetFormValues = {
    ...emptyDatasetFormValues(),
    name: 'clickbench',
    description: 'sample-test',
    data_source: 'source-1',
    resource: 's3://clickhouse-public-datasets/hits.parquet',
    mappings: { dynamic: true, fields: [] },
    ...overrides,
    settings: {
      ...emptyDatasetFormValues().settings,
      format: 'parquet',
      ...overrides.settings,
    },
  };

  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({ defaultValues });
    return (
      <FormProvider {...methods}>
        <StepReview dataSources={dataSources} />
      </FormProvider>
    );
  };

  return render(
    <EuiProvider>
      <I18nProvider>
        <Wrapper />
      </I18nProvider>
    </EuiProvider>
  );
};

describe('StepReview', () => {
  it('summarizes the dataset, settings and mappings', () => {
    const { getByText, getByTestId } = renderStepReview({
      settings: {
        ...emptyDatasetFormValues().settings,
        format: 'parquet',
        schema_resolution: 'first_file_wins',
      },
    });

    expect(getByText('Review configuration for clickbench')).toBeInTheDocument();

    expect(getByTestId('createDatasetWizardReview-data_source')).toHaveTextContent('source-1');
    expect(getByTestId('createDatasetWizardReview-data_source_type')).toHaveTextContent(
      'Amazon S3'
    );
    expect(getByTestId('createDatasetWizardReview-name')).toHaveTextContent('clickbench');
    expect(getByTestId('createDatasetWizardReview-description')).toHaveTextContent('sample-test');
    expect(getByTestId('createDatasetWizardReview-resource')).toHaveTextContent(
      's3://clickhouse-public-datasets/hits.parquet'
    );

    expect(getByTestId('createDatasetWizardReview-format')).toHaveTextContent('Parquet');
    expect(getByTestId('createDatasetWizardReview-schema_resolution')).toHaveTextContent(
      'First file winsCustom'
    );
    expect(getByTestId('createDatasetWizardReview-error_mode')).toHaveTextContent(
      'Fail fastDefault'
    );

    expect(getByTestId('createDatasetWizardReview-schema_mapping_mode')).toHaveTextContent(
      'Inferred from datasetDefault'
    );
    expect(getByTestId('createDatasetWizardReview-dynamic_fields')).toHaveTextContent('OnDefault');
  });

  it('reports declared mappings as custom', () => {
    const { getByTestId } = renderStepReview({
      mappings: {
        dynamic: false,
        fields: [{ id: '0', name: 'message', path: 'msg', type: 'keyword', format: '' }],
      },
    });

    expect(getByTestId('createDatasetWizardReview-schema_mapping_mode')).toHaveTextContent(
      'Declared in wizardCustom'
    );
    expect(getByTestId('createDatasetWizardReview-dynamic_fields')).toHaveTextContent('OffCustom');
    expect(getByTestId('createDatasetWizardReview-mapped_fields')).toHaveTextContent('1');
  });

  it('ignores a dynamic toggle that no declared field carries into the request', () => {
    const { getByTestId, queryByTestId } = renderStepReview({
      mappings: { dynamic: false, fields: [] },
    });

    // Without declared fields the request has no `mappings`, so the summary must not
    // claim the toggle was applied.
    expect(getByTestId('createDatasetWizardReview-dynamic_fields')).toHaveTextContent('OnDefault');
    expect(getByTestId('createDatasetWizardReview-schema_mapping_mode')).toHaveTextContent(
      'Inferred from datasetDefault'
    );
    expect(queryByTestId('createDatasetWizardReview-mapped_fields')).toBeNull();

    fireEvent.click(getByTestId('createDatasetWizardReviewRequestTabButton'));
    expect(getByTestId('createDatasetWizardReviewRequest')).not.toHaveTextContent('mappings');
  });

  it('spells out the timestamp column and the pattern it parses', () => {
    const { getByTestId } = renderStepReview({
      mappings: {
        dynamic: true,
        fields: [
          {
            id: '0',
            name: '@timestamp',
            path: 'event_time',
            type: 'date_nanos',
            format: 'iso8601',
          },
        ],
      },
    });

    expect(getByTestId('createDatasetWizardReview-timestamp_mapping')).toHaveTextContent(
      'OnDefault'
    );
    expect(getByTestId('createDatasetWizardReview-timestamp_path')).toHaveTextContent(
      'event_timeCustom'
    );
    expect(getByTestId('createDatasetWizardReview-timestamp_format')).toHaveTextContent(
      'iso8601Custom'
    );
  });

  it('falls back to the logical name and hides the format when neither is set', () => {
    const { getByTestId, queryByTestId } = renderStepReview({
      mappings: {
        dynamic: true,
        fields: [{ id: '0', name: '@timestamp', path: '', type: 'date', format: '' }],
      },
    });

    expect(getByTestId('createDatasetWizardReview-timestamp_path')).toHaveTextContent('@timestamp');
    expect(queryByTestId('createDatasetWizardReview-timestamp_format')).toBeNull();
  });

  it('reports a declared schema without a timestamp as not timeseries', () => {
    const { getByTestId, queryByTestId } = renderStepReview({
      mappings: {
        dynamic: true,
        fields: [{ id: '0', name: 'message', path: '', type: 'keyword', format: '' }],
      },
    });

    expect(getByTestId('createDatasetWizardReview-timestamp_mapping')).toHaveTextContent(
      'OffCustom'
    );
    expect(queryByTestId('createDatasetWizardReview-timestamp_path')).toBeNull();
  });

  it('skips mapping rows the user left incomplete', () => {
    const { getByTestId } = renderStepReview({
      mappings: {
        dynamic: true,
        fields: [
          { id: '0', name: 'message', path: '', type: 'keyword', format: '' },
          { id: '1', name: '  ', path: '', type: 'keyword', format: '' },
          { id: '2', name: 'incomplete', path: '', type: '', format: '' },
        ],
      },
    });

    expect(getByTestId('createDatasetWizardReview-mapped_fields')).toHaveTextContent('1');
  });

  it('shows the request that will be sent', () => {
    const { getByTestId } = renderStepReview({
      mappings: {
        dynamic: false,
        fields: [{ id: '0', name: 'message', path: 'msg', type: 'keyword', format: '' }],
      },
    });

    fireEvent.click(getByTestId('createDatasetWizardReviewRequestTabButton'));

    const request = getByTestId('createDatasetWizardReviewRequest');
    expect(request).toHaveTextContent('PUT /internal/data_federation/dataset/clickbench');
    expect(request).toHaveTextContent('"data_source": "source-1"');
    expect(request).toHaveTextContent('"format": "parquet"');
    expect(request).toHaveTextContent('"dynamic": "false"');
    // The name travels as the path id, not in the body.
    expect(request).not.toHaveTextContent('"name"');
  });
});
