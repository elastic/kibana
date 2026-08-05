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

jest.mock('./manual_schema_mappings_editor', () => ({
  ManualSchemaMappingsEditor: () => (
    <div data-test-subj="datasetWizardManualSchemaMappingsEditor">Manual mappings editor</div>
  ),
}));

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
  defaultValues = emptyDatasetWizardFormValues(),
}: {
  dataSources?: DataSource[];
  dataSource?: string;
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
      />
    </EuiProvider>
  );
};

describe('SchemaMappingsStep', () => {
  it('renders automatic and manual options for non-S3 data sources', () => {
    const { getByTestId, getByText, queryByTestId } = render(<TestHarness />);

    expect(getByText('Schema mappings (optional)')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSchemaMappingModeButtonGroup')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSchemaMappingModeAutomatic')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(queryByTestId('datasetWizardSchemaMappingModeAwsGlueTable')).toBeNull();
    expect(getByTestId('datasetWizardSchemaMappingModeDescription')).toHaveTextContent(
      'Elastic will sample the file and infer column names and types automatically.'
    );
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

  it('updates the description when switching schema mapping modes', () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness
        dataSources={[s3DataSource]}
        dataSource="s3-source"
      />
    );

    fireEvent.click(getByTestId('datasetWizardSchemaMappingModeAwsGlueTable'));
    expect(getByTestId('datasetWizardSchemaMappingModeDescription')).toHaveTextContent(
      'Use an AWS Glue table schema to define column names and types.'
    );

    fireEvent.click(getByTestId('datasetWizardSchemaMappingModeManual'));
    expect(queryByTestId('datasetWizardSchemaMappingModeDescription')).toBeNull();
    expect(getByTestId('datasetWizardManualSchemaMappingsEditor')).toBeInTheDocument();
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
});
