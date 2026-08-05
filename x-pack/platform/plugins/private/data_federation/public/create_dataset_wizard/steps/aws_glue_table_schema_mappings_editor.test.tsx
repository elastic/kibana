/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import { AwsGlueTableSchemaMappingsEditor } from './aws_glue_table_schema_mappings_editor';

const TestHarness = ({
  dataSourceRegion = 'us-west-1',
  defaultValues = emptyDatasetWizardFormValues(),
}: {
  dataSourceRegion?: string;
  defaultValues?: DatasetWizardFormValues;
}) => {
  const { control } = useForm<DatasetWizardFormValues>({
    defaultValues,
  });

  return (
    <EuiProvider>
      <AwsGlueTableSchemaMappingsEditor control={control} dataSourceRegion={dataSourceRegion} />
    </EuiProvider>
  );
};

describe('AwsGlueTableSchemaMappingsEditor', () => {
  it('renders the Glue callout, form fields, and permissions accordion', () => {
    render(<TestHarness />);

    expect(screen.getByTestId('datasetWizardAwsGlueCallout')).toHaveTextContent('Schema from Glue');
    expect(screen.getByTestId('datasetWizardGlueDatabase')).toBeInTheDocument();
    expect(screen.getByTestId('datasetWizardGlueTableName')).toBeInTheDocument();
    expect(screen.getByTestId('datasetWizardGlueCatalogRegion')).toBeInTheDocument();
    expect(screen.getByTestId('datasetWizardGlueAwsAccountId')).toBeInTheDocument();
    expect(screen.getByTestId('datasetWizardGluePermissionsAccordion')).toBeInTheDocument();
    expect(screen.getByTestId('datasetWizardGluePermissionsPolicy')).toHaveTextContent(
      'glue:GetTable'
    );
  });

  it('uses the data source region as the catalog region placeholder', () => {
    render(<TestHarness dataSourceRegion="eu-west-1" />);

    expect(screen.getByTestId('datasetWizardGlueCatalogRegion')).toHaveAttribute(
      'placeholder',
      'eu-west-1'
    );
  });

  it('updates glue form values', () => {
    const Harness = () => {
      const { control, watch } = useForm<DatasetWizardFormValues>({
        defaultValues: emptyDatasetWizardFormValues(),
      });

      return (
        <EuiProvider>
          <AwsGlueTableSchemaMappingsEditor control={control} dataSourceRegion="" />
          <span data-test-subj="glueDatabaseValue">{watch('glue_database')}</span>
        </EuiProvider>
      );
    };

    render(<Harness />);

    fireEvent.change(screen.getByTestId('datasetWizardGlueDatabase'), {
      target: { value: 'security_logs' },
    });

    expect(screen.getByTestId('glueDatabaseValue')).toHaveTextContent('security_logs');
  });

  it('exposes the IAM policy template for copy', () => {
    render(<TestHarness />);

    const policyBlock = screen.getByTestId('datasetWizardGluePermissionsPolicy');
    expect(policyBlock).toHaveTextContent('glue:GetTable');
    expect(policyBlock).toHaveTextContent('glue:GetDatabase');
    expect(policyBlock).toHaveTextContent('glue:GetPartitions');
    expect(policyBlock).toHaveTextContent('DATABASE_NAME/TABLE_NAME');
  });
});
