/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect, useMemo } from 'react';
import type { EuiButtonGroupProps } from '@elastic/eui';
import { EuiButtonGroup, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import type { DataSource } from '../../../common';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues, SchemaMappingMode } from '../dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import { InferredSchemaPreviewTable } from '../inferred_schema_preview_table';
import { getTestConfigurationPreviewFields } from '../test_configuration_preview_utils';
import { AwsGlueTableSchemaMappingsEditor } from './aws_glue_table_schema_mappings_editor';

const SCHEMA_MAPPING_MODE_DESCRIPTIONS: Record<'automatic', () => string> = {
  automatic: datasetWizardStrings.schemaMappingAutomaticDescription,
};

export const isAwsGlueTableSchemaMappingSupported = (
  dataSources: readonly DataSource[],
  dataSourceName: string
): boolean => dataSources.find((dataSource) => dataSource.name === dataSourceName)?.type === 's3';

export interface SchemaMappingsStepProps {
  control: Control<DatasetWizardFormValues>;
  dataSources: readonly DataSource[];
  dataSource: string;
  dataSourceRegion: string;
}

export const SchemaMappingsStep: FunctionComponent<SchemaMappingsStepProps> = ({
  control,
  dataSources,
  dataSource,
  dataSourceRegion,
}) => {
  const { field } = useController({
    control,
    name: 'schema_mapping_mode',
  });

  const isAwsGlueTableSupported = useMemo(
    () => isAwsGlueTableSchemaMappingSupported(dataSources, dataSource),
    [dataSource, dataSources]
  );

  useEffect(() => {
    if (!isAwsGlueTableSupported && field.value === 'aws_glue_table') {
      field.onChange('automatic');
    }
  }, [field, isAwsGlueTableSupported]);

  useEffect(() => {
    if (field.value === 'manual') {
      field.onChange('automatic');
    }
  }, [field]);

  const options = useMemo<EuiButtonGroupProps['options']>(() => {
    const allOptions: EuiButtonGroupProps['options'] = [
      {
        id: 'automatic',
        label: datasetWizardStrings.schemaMappingModeAutomatic(),
        'data-test-subj': 'datasetWizardSchemaMappingModeAutomatic',
      },
      {
        id: 'aws_glue_table',
        label: datasetWizardStrings.schemaMappingModeAwsGlueTable(),
        'data-test-subj': 'datasetWizardSchemaMappingModeAwsGlueTable',
      },
    ];

    return isAwsGlueTableSupported
      ? allOptions
      : allOptions.filter((option) => option.id !== 'aws_glue_table');
  }, [isAwsGlueTableSupported]);

  const selectedMode = field.value === 'manual' ? 'automatic' : field.value;
  const settings = useWatch({ control, name: 'settings' });
  const automaticSchemaSampleFields = useMemo(() => {
    const previewValues: DatasetWizardFormValues = {
      ...emptyDatasetWizardFormValues(),
      settings: settings ?? emptyDatasetWizardFormValues().settings,
      schema_mapping_mode: 'automatic',
    };

    return getTestConfigurationPreviewFields(previewValues);
  }, [settings]);

  return (
    <div data-test-subj="datasetWizardSchemaMappingsStep">
      <EuiTitle size="s">
        <h3>{datasetWizardStrings.schemaMappingsTitle()}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>{datasetWizardStrings.schemaMappingsDescription()}</p>
      </EuiText>
      <EuiSpacer size="l" />

      <EuiButtonGroup
        legend={datasetWizardStrings.schemaMappingModeLegend()}
        type="single"
        options={options}
        idSelected={selectedMode}
        onChange={(id) => {
          field.onChange(id as SchemaMappingMode);
        }}
        isFullWidth
        data-test-subj="datasetWizardSchemaMappingModeButtonGroup"
      />

      <EuiSpacer size="l" />
      {selectedMode === 'aws_glue_table' ? (
        <AwsGlueTableSchemaMappingsEditor
          control={control}
          dataSourceRegion={dataSourceRegion}
        />
      ) : (
        <>
          <EuiText size="s" data-test-subj="datasetWizardSchemaMappingModeDescription">
            <p>{SCHEMA_MAPPING_MODE_DESCRIPTIONS[selectedMode]()}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <InferredSchemaPreviewTable
            control={control}
            inferredFields={automaticSchemaSampleFields}
            testSubjPrefix="datasetWizardAutomaticSchemaSample"
          />
        </>
      )}
    </div>
  );
};
