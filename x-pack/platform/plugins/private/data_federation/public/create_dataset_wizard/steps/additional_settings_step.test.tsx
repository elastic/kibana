/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_2,
  type DatasetWizardFlowVariant,
} from '../dataset_wizard_flow_variant';
import { NULL_VALUE_EMPTY_STRING_PRESET } from '../../create_dataset_flyout/dataset_settings_options';
import { AdditionalSettingsStep } from './additional_settings_step';

const TestHarness = ({
  resource,
  isEditMode = false,
  flowVariant = DATASET_WIZARD_FLOW_VARIANT_2,
}: {
  resource: string;
  isEditMode?: boolean;
  flowVariant?: DatasetWizardFlowVariant;
}) => {
  const syncedResourceRef = useRef<string | null>(null);
  const { control, getValues, setValue } = useForm<DatasetWizardFormValues>({
    defaultValues: emptyDatasetWizardFormValues(),
  });

  return (
    <EuiProvider>
      <AdditionalSettingsStep
        control={control}
        getValues={getValues}
        setValue={setValue}
        resource={resource}
        syncedResourceRef={syncedResourceRef}
        isEditMode={isEditMode}
        flowVariant={flowVariant}
      />
    </EuiProvider>
  );
};

describe('AdditionalSettingsStep', () => {
  it('renders format field and accordions when format is auto-detected', async () => {
    const { getByTestId, getByText } = render(
      <TestHarness resource="s3://bucket/data.csv" />
    );

    expect(getByText('Additional settings (optional)')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSettingsFormat')).toBeInTheDocument();

    await waitFor(() => {
      expect(getByTestId('datasetWizardAccordionStructureAndSchema')).toBeInTheDocument();
      expect(getByTestId('datasetWizardAccordionTextParsing')).toBeInTheDocument();
      expect(getByTestId('datasetWizardCommonSettingsPanel')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsDelimiter')).toBeInTheDocument();
    });
  });

  it('leaves format empty and hides accordions when extension is not recognized', () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness resource="s3://bucket/data.json" />
    );

    expect(getByTestId('datasetWizardSettingsFormat')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardAccordionStructureAndSchema')).toBeNull();
  });

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'prefills csv defaults when format is auto-detected in %s',
    async (flowVariant) => {
      const Harness = () => {
        const syncedResourceRef = useRef<string | null>(null);
        const { control, getValues, setValue, watch } = useForm<DatasetWizardFormValues>({
          defaultValues: emptyDatasetWizardFormValues(),
        });
        const settings = watch('settings');

        return (
          <EuiProvider>
            <AdditionalSettingsStep
              control={control}
              getValues={getValues}
              setValue={setValue}
              resource="s3://bucket/data.csv"
              syncedResourceRef={syncedResourceRef}
              isEditMode={false}
              flowVariant={flowVariant}
            />
            <div data-test-subj="settingsSnapshot">{JSON.stringify(settings)}</div>
          </EuiProvider>
        );
      };

      const { getByTestId } = render(<Harness />);

      await waitFor(() => {
        const settings = JSON.parse(getByTestId('settingsSnapshot').textContent ?? '{}');
        expect(settings).toMatchObject({
          format: 'csv',
          delimiter: ',',
          mode: 'quoted',
          header_row: 'true',
          null_value: NULL_VALUE_EMPTY_STRING_PRESET,
          encoding: 'UTF-8',
          quote: '"',
          escape: '\\',
          comment: '//',
          column_prefix: 'col',
          schema_sample_size: '20000',
          datetime_format: 'ISO-8601',
          multi_value_syntax: 'none',
          max_field_size: '10485760',
          partition_detection: 'auto',
          schema_resolution: 'union_by_name',
          hive_partitioning: 'false',
          error_mode: 'fail_fast',
          max_error_ratio: '0.0',
        });
      });
    }
  );

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'prefills tsv defaults when format is auto-detected in %s',
    async (flowVariant) => {
      const Harness = () => {
        const syncedResourceRef = useRef<string | null>(null);
        const { control, getValues, setValue, watch } = useForm<DatasetWizardFormValues>({
          defaultValues: emptyDatasetWizardFormValues(),
        });
        const settings = watch('settings');

        return (
          <EuiProvider>
            <AdditionalSettingsStep
              control={control}
              getValues={getValues}
              setValue={setValue}
              resource="s3://bucket/data.tsv"
              syncedResourceRef={syncedResourceRef}
              isEditMode={false}
              flowVariant={flowVariant}
            />
            <div data-test-subj="settingsSnapshot">{JSON.stringify(settings)}</div>
          </EuiProvider>
        );
      };

      const { getByTestId } = render(<Harness />);

      await waitFor(() => {
        const settings = JSON.parse(getByTestId('settingsSnapshot').textContent ?? '{}');
        expect(settings).toMatchObject({
          format: 'tsv',
          delimiter: '\t',
          mode: 'plain',
          header_row: 'true',
          null_value: NULL_VALUE_EMPTY_STRING_PRESET,
          encoding: 'UTF-8',
          quote: '"',
          escape: '\\',
          comment: '//',
          column_prefix: 'col',
          schema_sample_size: '20000',
          datetime_format: 'ISO-8601',
          multi_value_syntax: 'none',
          max_field_size: '10485760',
          partition_detection: 'auto',
          schema_resolution: 'union_by_name',
          hive_partitioning: 'false',
          error_mode: 'fail_fast',
          max_error_ratio: '0.0',
        });
      });
    }
  );

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'shows error handling for parquet format in %s',
    async (flowVariant) => {
      const { getByTestId, queryByTestId } = render(
        <TestHarness resource="s3://bucket/data.parquet" flowVariant={flowVariant} />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardAccordionStructureAndSchema')).toBeInTheDocument();
      });

      expect(queryByTestId('datasetWizardAccordionTextParsing')).toBeNull();
      expect(getByTestId('datasetWizardAccordionErrorHandling')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsErrorMode')).toBeInTheDocument();
      expect(queryByTestId('datasetWizardCommonSettingsPanel')).toBeNull();
      expect(getByTestId('datasetWizardAccordionLimitsAndPerformance')).toBeInTheDocument();
    }
  );

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'shows error handling for ndjson format in %s',
    async (flowVariant) => {
      const { getByTestId, queryByTestId } = render(
        <TestHarness resource="s3://bucket/data.ndjson" flowVariant={flowVariant} />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardAccordionStructureAndSchema')).toBeInTheDocument();
      });

      expect(getByTestId('datasetWizardAccordionErrorHandling')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsErrorMode')).toBeInTheDocument();
      expect(getByTestId('datasetWizardCommonSettingsPanel')).toBeInTheDocument();
      expect(queryByTestId('datasetWizardAccordionTextParsing')).toBeNull();
      expect(getByTestId('datasetWizardAccordionLimitsAndPerformance')).toBeInTheDocument();
    }
  );

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'shows error handling for orc format in %s',
    async (flowVariant) => {
      const { getByTestId, queryByTestId } = render(
        <TestHarness resource="s3://bucket/data.orc" flowVariant={flowVariant} />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardAccordionStructureAndSchema')).toBeInTheDocument();
      });

      expect(getByTestId('datasetWizardAccordionErrorHandling')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsErrorMode')).toBeInTheDocument();
      expect(queryByTestId('datasetWizardAccordionTextParsing')).toBeNull();
      expect(queryByTestId('datasetWizardCommonSettingsPanel')).toBeNull();
      expect(queryByTestId('datasetWizardAccordionLimitsAndPerformance')).toBeNull();
    }
  );

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'prefills orc defaults when format is auto-detected in %s',
    async (flowVariant) => {
      const Harness = () => {
        const syncedResourceRef = useRef<string | null>(null);
        const { control, getValues, setValue, watch } = useForm<DatasetWizardFormValues>({
          defaultValues: emptyDatasetWizardFormValues(),
        });
        const settings = watch('settings');

        return (
          <EuiProvider>
            <AdditionalSettingsStep
              control={control}
              getValues={getValues}
              setValue={setValue}
              resource="s3://bucket/data.orc"
              syncedResourceRef={syncedResourceRef}
              isEditMode={false}
              flowVariant={flowVariant}
            />
            <div data-test-subj="settingsSnapshot">{JSON.stringify(settings)}</div>
          </EuiProvider>
        );
      };

      const { getByTestId } = render(<Harness />);

      await waitFor(() => {
        const settings = JSON.parse(getByTestId('settingsSnapshot').textContent ?? '{}');
        expect(settings).toMatchObject({
          format: 'orc',
          partition_detection: 'auto',
          schema_resolution: 'union_by_name',
          hive_partitioning: 'true',
          error_mode: 'fail_fast',
          max_error_ratio: '0.0',
          partition_path: '',
          max_errors: '',
        });
      });
    }
  );

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'prefills ndjson defaults when format is auto-detected in %s',
    async (flowVariant) => {
      const Harness = () => {
        const syncedResourceRef = useRef<string | null>(null);
        const { control, getValues, setValue, watch } = useForm<DatasetWizardFormValues>({
          defaultValues: emptyDatasetWizardFormValues(),
        });
        const settings = watch('settings');

        return (
          <EuiProvider>
            <AdditionalSettingsStep
              control={control}
              getValues={getValues}
              setValue={setValue}
              resource="s3://bucket/data.ndjson"
              syncedResourceRef={syncedResourceRef}
              isEditMode={false}
              flowVariant={flowVariant}
            />
            <div data-test-subj="settingsSnapshot">{JSON.stringify(settings)}</div>
          </EuiProvider>
        );
      };

      const { getByTestId } = render(<Harness />);

      await waitFor(() => {
        const settings = JSON.parse(getByTestId('settingsSnapshot').textContent ?? '{}');
        expect(settings).toMatchObject({
          format: 'ndjson',
          schema_sample_size: '20000',
          datetime_format: 'ISO-8601',
          partition_detection: 'auto',
          schema_resolution: 'union_by_name',
          hive_partitioning: 'false',
          error_mode: 'fail_fast',
          max_error_ratio: '0.0',
          segment_size: '4mb',
        });
      });
    }
  );

  it('shows datetime format in common settings for ndjson without columns accordion', async () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness resource="s3://bucket/data.ndjson" />
    );

    await waitFor(() => {
      expect(getByTestId('datasetWizardCommonSettingsPanel')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsDatetimeFormat')).toBeInTheDocument();
    });

    expect(queryByTestId('datasetWizardSettingsDelimiter')).toBeNull();
    expect(queryByTestId('datasetWizardAccordionColumnsAndValues')).toBeNull();
  });
});
