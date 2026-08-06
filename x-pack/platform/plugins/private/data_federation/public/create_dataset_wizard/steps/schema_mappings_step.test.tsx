/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import type { DataSource } from '../../../common';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import { SchemaMappingsStep } from './schema_mappings_step';

const s3DataSource: DataSource = {
  name: 's3-source',
  type: 's3',
  description: '',
  settings: {},
};

const gcsDataSource: DataSource = {
  name: 'gcs-source',
  type: 'gcs',
  description: '',
  settings: {},
};

const TestHarness = ({
  dataSources = [gcsDataSource],
  dataSource = 'gcs-source',
  dataSourceRegion = '',
  defaultValues = emptyDatasetWizardFormValues(),
}: {
  dataSources?: DataSource[];
  dataSource?: string;
  dataSourceRegion?: string;
  defaultValues?: DatasetWizardFormValues;
}) => {
  const { control } = useForm<DatasetWizardFormValues>({
    defaultValues: {
      ...defaultValues,
      data_source: dataSource,
    },
  });

  return (
    <EuiProvider>
      <SchemaMappingsStep
        control={control}
        dataSources={dataSources}
        dataSource={dataSource}
        dataSourceRegion={dataSourceRegion}
      />
    </EuiProvider>
  );
};

describe('SchemaMappingsStep', () => {
  it('renders the automatic option for non-S3 data sources', () => {
    const { getByTestId, getByText, queryByTestId } = render(<TestHarness />);

    expect(getByText('Schema mappings (optional)')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSchemaMappingModeButtonGroup')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSchemaMappingModeAutomatic')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(queryByTestId('datasetWizardSchemaMappingModeAwsGlueTable')).toBeNull();
    expect(getByTestId('datasetWizardSchemaMappingModeDescription')).toHaveTextContent(
      'Elastic infers field names and types from your file. Review the sample below and adjust any type before continuing.'
    );
    expect(getByTestId('datasetWizardAutomaticSchemaSampleTable')).toBeInTheDocument();
  });

  it('shows the AWS Glue table option for S3 data sources', () => {
    const { getByTestId } = render(
      <TestHarness
        dataSources={[s3DataSource]}
        dataSource="s3-source"
      />
    );

    expect(getByTestId('datasetWizardSchemaMappingModeAwsGlueTable')).toBeInTheDocument();
  });

  it('updates the editor when switching to AWS Glue table mode', () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness
        dataSources={[s3DataSource]}
        dataSource="s3-source"
      />
    );

    fireEvent.click(getByTestId('datasetWizardSchemaMappingModeAwsGlueTable'));
    expect(getByTestId('datasetWizardAwsGlueTableSchemaMappings')).toBeInTheDocument();
    expect(getByTestId('datasetWizardAwsGlueCallout')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardSchemaMappingModeDescription')).toBeNull();
    expect(queryByTestId('datasetWizardAutomaticSchemaSampleTable')).toBeNull();
  });

  it('resets aws_glue_table to automatic when the data source is not S3', () => {
    const Harness = ({ dataSource }: { dataSource: string }) => {
      const { control, watch } = useForm<DatasetWizardFormValues>({
        defaultValues: {
          ...emptyDatasetWizardFormValues(),
          data_source: dataSource,
          schema_mapping_mode: 'aws_glue_table',
        },
      });

      return (
        <EuiProvider>
          <SchemaMappingsStep
            control={control}
            dataSources={[s3DataSource, gcsDataSource]}
            dataSource={dataSource}
            dataSourceRegion=""
          />
          <span data-test-subj="schemaMappingModeValue">{watch('schema_mapping_mode')}</span>
        </EuiProvider>
      );
    };

    const { getByTestId, rerender } = render(<Harness dataSource="s3-source" />);

    expect(getByTestId('schemaMappingModeValue')).toHaveTextContent('aws_glue_table');

    rerender(<Harness dataSource="gcs-source" />);

    expect(getByTestId('schemaMappingModeValue')).toHaveTextContent('automatic');
  });

  it('resets manual to automatic when manual mode is no longer supported', () => {
    const { getByTestId } = render(
      <TestHarness
        defaultValues={{
          ...emptyDatasetWizardFormValues(),
          schema_mapping_mode: 'manual',
        }}
      />
    );

    expect(getByTestId('datasetWizardSchemaMappingModeAutomatic')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(getByTestId('datasetWizardAutomaticSchemaSampleTable')).toBeInTheDocument();
  });
});
