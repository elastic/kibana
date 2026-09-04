/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiButtonGroupProps } from '@elastic/eui';
import { EuiButtonGroup, EuiSpacer, EuiText, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import type { DataSource } from '../../../common';
import type { DatasetFormatFormValue } from '../../create_dataset_flyout/create_dataset_flyout_form_state';
import { DatasetSettingDefaultHintsProvider } from '../../create_dataset_flyout/dataset_settings_default_hints';
import { DatasetSettingsFieldsLayout } from '../../create_dataset_flyout/dataset_settings_fields_layout';
import { DatasetSettingsSectionAccordion } from '../../create_dataset_flyout/dataset_settings_section_accordion';
import type { DatasetWizardFlowVariant } from '../dataset_wizard_flow_variant';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  isDatasetWizardFlow3,
  isDatasetWizardFlow396,
} from '../dataset_wizard_flow_variant';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import { DynamicFieldsSetting } from '../dynamic_fields_setting';
import type { DatasetWizardFormValues, SchemaMappingMode } from '../dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import { getSchemaMappingSettingsFieldIds } from '../schema_mapping_settings_fields';
import { InferredSchemaPreviewTable } from '../inferred_schema_preview_table';
import { getTestConfigurationPreviewFields } from '../test_configuration_preview_utils';
import { AwsGlueTableSchemaMappingsEditor } from './aws_glue_table_schema_mappings_editor';
import { InferredSchemaMappingsEditor } from './inferred_schema_mappings_editor';
import {
  SchemaMappingsStepFlow1,
  isAwsGlueTableSchemaMappingSupported,
} from './schema_mappings_step_flow_1';

export { isAwsGlueTableSchemaMappingSupported };

const FORMAT_VALUES: Exclude<DatasetFormatFormValue, ''>[] = [
  'csv',
  'tsv',
  'parquet',
  'ndjson',
  'orc',
];

const isKnownFormat = (value: string): value is Exclude<DatasetFormatFormValue, ''> =>
  FORMAT_VALUES.includes(value as Exclude<DatasetFormatFormValue, ''>);

/**
 * Both sections rule off every edge, so the edge they share would read as a
 * doubled line while they sit back to back.
 */
const collapseSharedAccordionBorderCss = css`
  margin-block-start: -1px;
`;

const SCHEMA_MAPPING_MODE_DESCRIPTIONS: Record<'automatic', () => string> = {
  automatic: datasetWizardStrings.schemaMappingAutomaticDescription,
};

export interface SchemaMappingsStepProps {
  control: Control<DatasetWizardFormValues>;
  dataSources: readonly DataSource[];
  dataSource: string;
  dataSourceRegion: string;
  flowVariant: DatasetWizardFlowVariant;
}

export const SchemaMappingsStepFlow2: FunctionComponent<SchemaMappingsStepProps> = ({
  control,
  dataSources,
  dataSource,
  dataSourceRegion,
  flowVariant,
}) => {
  const { field } = useController({
    control,
    name: 'schema_mapping_mode',
  });
  const hideAwsGlueTable = isDatasetWizardFlow3(flowVariant);
  const isFlow396 = isDatasetWizardFlow396(flowVariant);
  const format = useWatch({ control, name: 'settings.format' }) as DatasetFormatFormValue;
  const errorMode = useWatch({ control, name: 'settings.error_mode' });
  const hasFormatSelected = isKnownFormat(format);
  const schemaMappingSettingsFields = useMemo(
    () =>
      hasFormatSelected
        ? getSchemaMappingSettingsFieldIds(format, errorMode, { showForAllFormats: isFlow396 })
        : [],
    [errorMode, format, hasFormatSelected, isFlow396]
  );

  const schemaSettingsAccordionId = useGeneratedHtmlId({
    prefix: 'datasetWizardSchemaSettingsAccordion',
  });

  const isAwsGlueTableSupported = useMemo(
    () => isAwsGlueTableSchemaMappingSupported(dataSources, dataSource),
    [dataSource, dataSources]
  );

  useEffect(() => {
    if ((hideAwsGlueTable || !isAwsGlueTableSupported) && field.value === 'aws_glue_table') {
      field.onChange('automatic');
    }
  }, [field, hideAwsGlueTable, isAwsGlueTableSupported]);

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

    return hideAwsGlueTable || !isAwsGlueTableSupported
      ? allOptions.filter((option) => option.id !== 'aws_glue_table')
      : allOptions;
  }, [hideAwsGlueTable, isAwsGlueTableSupported]);

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
      <EuiText
        size="s"
        color="subdued"
        data-test-subj={hideAwsGlueTable ? 'datasetWizardSchemaMappingModeDescription' : undefined}
      >
        <p>
          {hideAwsGlueTable
            ? datasetWizardStrings.schemaMappingsDescriptionFlow3()
            : datasetWizardStrings.schemaMappingsDescription()}
        </p>
      </EuiText>
      {isFlow396 ? (
        <>
          <EuiSpacer size="l" />
          <DatasetSettingsSectionAccordion
            id={schemaSettingsAccordionId}
            title={datasetWizardStrings.schemaSettingsTitle()}
            contentLayout="indented"
            initialIsOpen
            dataTestSubj="datasetWizardSchemaSettingsAccordion"
            fieldsDataTestSubj="datasetWizardSchemaMappingSettings"
          >
            <DynamicFieldsSetting control={control} />
            {hasFormatSelected && schemaMappingSettingsFields.length > 0 ? (
              <>
                <EuiSpacer size="m" />
                <DatasetSettingDefaultHintsProvider format={format} isEnabled>
                  <DatasetSettingsFieldsLayout
                    control={control}
                    fields={schemaMappingSettingsFields}
                    testSubjPrefix="datasetWizard"
                    columns={1}
                    rowSpacerSize="m"
                    constrainWidth={false}
                    variant="step"
                  />
                </DatasetSettingDefaultHintsProvider>
              </>
            ) : null}
          </DatasetSettingsSectionAccordion>
        </>
      ) : null}
      {isFlow396 ? null : <EuiSpacer size="l" />}

      {hideAwsGlueTable ? (
        <div css={isFlow396 ? collapseSharedAccordionBorderCss : undefined}>
          <InferredSchemaMappingsEditor
            control={control}
            flowVariant={flowVariant}
            inferredFields={automaticSchemaSampleFields}
          />
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export const SchemaMappingsStep: FunctionComponent<SchemaMappingsStepProps> = (props) =>
  props.flowVariant === DATASET_WIZARD_FLOW_VARIANT_1 ? (
    <SchemaMappingsStepFlow1 {...props} />
  ) : (
    <SchemaMappingsStepFlow2 {...props} />
  );
