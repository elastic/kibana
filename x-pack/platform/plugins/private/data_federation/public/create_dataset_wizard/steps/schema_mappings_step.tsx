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
import { useController } from 'react-hook-form';

import type { DataSource } from '../../../common';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues, SchemaMappingMode } from '../dataset_wizard_form_state';
import { ManualSchemaMappingsEditor } from './manual_schema_mappings_editor';

const SCHEMA_MAPPING_MODE_DESCRIPTIONS: Record<
  Exclude<SchemaMappingMode, 'manual'>,
  () => string
> = {
  automatic: datasetWizardStrings.schemaMappingAutomaticDescription,
  aws_glue_table: datasetWizardStrings.schemaMappingAwsGlueTableDescription,
};

export const isAwsGlueTableSchemaMappingSupported = (
  dataSources: readonly DataSource[],
  dataSourceName: string
): boolean => dataSources.find((dataSource) => dataSource.name === dataSourceName)?.type === 's3';

export interface SchemaMappingsStepProps {
  control: Control<DatasetWizardFormValues>;
  dataSources: readonly DataSource[];
  dataSource: string;
}

export const SchemaMappingsStep: FunctionComponent<SchemaMappingsStepProps> = ({
  control,
  dataSources,
  dataSource,
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
      {
        id: 'manual',
        label: datasetWizardStrings.schemaMappingModeManual(),
        'data-test-subj': 'datasetWizardSchemaMappingModeManual',
      },
    ];

    return isAwsGlueTableSupported
      ? allOptions
      : allOptions.filter((option) => option.id !== 'aws_glue_table');
  }, [isAwsGlueTableSupported]);

  const selectedMode = field.value;

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
        idSelected={field.value}
        onChange={(id) => {
          field.onChange(id as SchemaMappingMode);
        }}
        isFullWidth
        data-test-subj="datasetWizardSchemaMappingModeButtonGroup"
      />

      <EuiSpacer size="l" />
      {selectedMode === 'manual' ? (
        <ManualSchemaMappingsEditor control={control} />
      ) : (
        <EuiText size="s" data-test-subj="datasetWizardSchemaMappingModeDescription">
          <p>{SCHEMA_MAPPING_MODE_DESCRIPTIONS[selectedMode]()}</p>
        </EuiText>
      )}
    </div>
  );
};
