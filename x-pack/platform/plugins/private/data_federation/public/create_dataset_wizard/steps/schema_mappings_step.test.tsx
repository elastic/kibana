/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import type { DataSource } from '../../../common';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_2,
  DATASET_WIZARD_FLOW_VARIANT_3,
  DATASET_WIZARD_FLOW_VARIANT_3_9_6,
  type DatasetWizardFlowVariant,
} from '../dataset_wizard_flow_variant';
import { SchemaMappingsStep } from './schema_mappings_step';

jest.mock('./manual_schema_mappings_editor', () => ({
  ManualSchemaMappingsEditor: () => (
    <div data-test-subj="datasetWizardManualSchemaMappingsEditor">Manual mappings editor</div>
  ),
}));

jest.mock('./inferred_schema_mappings_editor', () => ({
  InferredSchemaMappingsEditor: ({
    inferredFields,
  }: {
    inferredFields: Array<{ name: string; type?: string }>;
  }) => (
    <div data-test-subj="datasetWizardInferredSchemaMappingsEditor">
      <span data-test-subj="datasetWizardInferredSchemaMappingsEditorFieldCount">
        {inferredFields.length}
      </span>
    </div>
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
  dataSourceRegion = '',
  defaultValues = emptyDatasetWizardFormValues(),
  flowVariant = DATASET_WIZARD_FLOW_VARIANT_1,
}: {
  dataSources?: DataSource[];
  dataSource?: string;
  dataSourceRegion?: string;
  defaultValues?: DatasetWizardFormValues;
  flowVariant?: DatasetWizardFlowVariant;
}) => {
  const { control } = useForm<DatasetWizardFormValues>({
    defaultValues: {
      ...defaultValues,
      data_source: dataSource,
    },
  });

  return (
    <EuiProvider>
      <I18nProvider>
        <SchemaMappingsStep
          control={control}
          dataSources={dataSources}
          dataSource={dataSource}
          dataSourceRegion={dataSourceRegion}
          flowVariant={flowVariant}
        />
      </I18nProvider>
    </EuiProvider>
  );
};

describe('SchemaMappingsStep flow 1', () => {
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

  it('updates the editor when switching schema mapping modes', () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness dataSources={[s3DataSource]} dataSource="s3-source" />
    );

    fireEvent.click(getByTestId('datasetWizardSchemaMappingModeAwsGlueTable'));
    expect(getByTestId('datasetWizardAwsGlueTableSchemaMappings')).toBeInTheDocument();
    expect(getByTestId('datasetWizardAwsGlueCallout')).toBeInTheDocument();

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
            dataSourceRegion=""
            flowVariant={DATASET_WIZARD_FLOW_VARIANT_1}
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

describe('SchemaMappingsStep flow 2', () => {
  it('renders the infer from file option for non-S3 data sources', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_2} />
    );

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
        flowVariant={DATASET_WIZARD_FLOW_VARIANT_2}
      />
    );

    expect(getByTestId('datasetWizardSchemaMappingModeAwsGlueTable')).toBeInTheDocument();
  });

  it('updates the editor when switching to AWS Glue table mode', () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness
        dataSources={[s3DataSource]}
        dataSource="s3-source"
        flowVariant={DATASET_WIZARD_FLOW_VARIANT_2}
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
            flowVariant={DATASET_WIZARD_FLOW_VARIANT_2}
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
        flowVariant={DATASET_WIZARD_FLOW_VARIANT_2}
      />
    );

    expect(getByTestId('datasetWizardSchemaMappingModeAutomatic')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(getByTestId('datasetWizardAutomaticSchemaSampleTable')).toBeInTheDocument();
  });
});

describe('SchemaMappingsStep flow 3', () => {
  it('hides the schema mapping mode buttons and shows the schema mappings editor immediately', () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness
        dataSources={[s3DataSource]}
        dataSource="s3-source"
        flowVariant={DATASET_WIZARD_FLOW_VARIANT_3}
        defaultValues={{
          ...emptyDatasetWizardFormValues(),
          settings: {
            ...emptyDatasetWizardFormValues().settings,
            format: 'parquet',
          },
        }}
      />
    );

    expect(queryByTestId('datasetWizardSchemaMappingModeButtonGroup')).toBeNull();
    expect(queryByTestId('datasetWizardSchemaMappingModeAutomatic')).toBeNull();
    expect(queryByTestId('datasetWizardSchemaMappingModeAwsGlueTable')).toBeNull();
    expect(getByTestId('datasetWizardSchemaMappingModeDescription')).toHaveTextContent(
      'Optional definition of how documents should be indexed. Elastic infers the schema at query time by default.'
    );
    expect(queryByTestId('datasetWizardAutomaticSchemaSampleTable')).toBeNull();
    expect(getByTestId('datasetWizardInferredSchemaMappingsEditor')).toBeInTheDocument();
    expect(
      Number(getByTestId('datasetWizardInferredSchemaMappingsEditorFieldCount').textContent)
    ).toBeGreaterThan(0);
  });
});

describe('SchemaMappingsStep flow 3 9.6', () => {
  it('shows schema mapping settings under the step description', async () => {
    const { getByTestId } = render(
      <TestHarness
        dataSources={[s3DataSource]}
        dataSource="s3-source"
        flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
        defaultValues={{
          ...emptyDatasetWizardFormValues(),
          settings: {
            ...emptyDatasetWizardFormValues().settings,
            format: 'parquet',
          },
        }}
      />
    );

    expect(getByTestId('datasetWizardSchemaMappingModeDescription')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSchemaMappingSettings')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSettingsSchemaResolution')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSettingsSchemaSampleSize')).toBeInTheDocument();
    expect(getByTestId('datasetWizardInferredSchemaMappingsEditor')).toBeInTheDocument();
  });

  it('groups the schema mapping settings in a section that opens by default', () => {
    const { getByTestId, getByRole } = render(
      <TestHarness
        dataSources={[s3DataSource]}
        dataSource="s3-source"
        flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
        defaultValues={{
          ...emptyDatasetWizardFormValues(),
          settings: {
            ...emptyDatasetWizardFormValues().settings,
            format: 'parquet',
          },
        }}
      />
    );

    const accordion = getByTestId('datasetWizardSchemaSettingsAccordion');
    const accordionButton = getByRole('button', { name: 'Schema settings (optional)' });

    expect(accordion).toContainElement(accordionButton);
    expect(accordionButton).toHaveAttribute('aria-expanded', 'true');
    expect(getByTestId('datasetWizardSettingsSchemaSampleSize')).toBeInTheDocument();

    fireEvent.click(accordionButton);
    expect(accordionButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows schema mapping settings for csv', () => {
    const { getByTestId } = render(
      <TestHarness
        dataSources={[s3DataSource]}
        dataSource="s3-source"
        flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
        defaultValues={{
          ...emptyDatasetWizardFormValues(),
          settings: {
            ...emptyDatasetWizardFormValues().settings,
            format: 'csv',
          },
        }}
      />
    );

    expect(getByTestId('datasetWizardSettingsSchemaSampleSize')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSettingsSchemaResolution')).toBeInTheDocument();
  });

  it('shows schema mapping settings for ndjson', () => {
    const { getByTestId } = render(
      <TestHarness
        dataSources={[s3DataSource]}
        dataSource="s3-source"
        flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
        defaultValues={{
          ...emptyDatasetWizardFormValues(),
          settings: {
            ...emptyDatasetWizardFormValues().settings,
            format: 'ndjson',
          },
        }}
      />
    );

    expect(getByTestId('datasetWizardSettingsSchemaSampleSize')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSettingsSchemaResolution')).toBeInTheDocument();
  });
});
