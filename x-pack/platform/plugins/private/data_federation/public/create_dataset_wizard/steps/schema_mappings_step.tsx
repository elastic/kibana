/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiButtonGroupProps } from '@elastic/eui';
import { EuiButton, EuiButtonGroup, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import type { DataSource } from '../../../common';
import type { DatasetWizardFlowVariant } from '../dataset_wizard_flow_variant';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  isDatasetWizardFlow3,
} from '../dataset_wizard_flow_variant';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues, SchemaMappingMode } from '../dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import {
  countModifiedAutomaticFieldTypesForFlow3,
  seedAutomaticFieldTypesFromInferred,
} from '../automatic_field_types_utils';
import { InferredSchemaPreviewTable } from '../inferred_schema_preview_table';
import { getTestConfigurationPreviewFields } from '../test_configuration_preview_utils';
import { AwsGlueTableSchemaMappingsEditor } from './aws_glue_table_schema_mappings_editor';
import { InferredSchemaMappingsEditor } from './inferred_schema_mappings_editor';
import { SchemaMappingsStepFlow1, isAwsGlueTableSchemaMappingSupported } from './schema_mappings_step_flow_1';

export { isAwsGlueTableSchemaMappingSupported };

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
  const { field: automaticFieldTypesField } = useController({
    control,
    name: 'automatic_field_types',
  });
  const hideAwsGlueTable = isDatasetWizardFlow3(flowVariant);
  const [hasGeneratedSchema, setHasGeneratedSchema] = useState(
    () => hideAwsGlueTable && Object.keys(automaticFieldTypesField.value ?? {}).length > 0
  );
  const [schemaEditorKey, setSchemaEditorKey] = useState(0);

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

  const hasSchemaModifications = useMemo(
    () =>
      countModifiedAutomaticFieldTypesForFlow3(
        automaticSchemaSampleFields,
        automaticFieldTypesField.value ?? {}
      ) > 0,
    [automaticFieldTypesField.value, automaticSchemaSampleFields]
  );

  const handleResetInferredSchema = useCallback(() => {
    automaticFieldTypesField.onChange(
      seedAutomaticFieldTypesFromInferred(automaticSchemaSampleFields)
    );
    setSchemaEditorKey((currentKey) => currentKey + 1);
  }, [automaticFieldTypesField, automaticSchemaSampleFields]);

  return (
    <div data-test-subj="datasetWizardSchemaMappingsStep">
      <EuiTitle size="s">
        <h3>{datasetWizardStrings.schemaMappingsTitle()}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText
        size="s"
        color="subdued"
        data-test-subj={
          hideAwsGlueTable ? 'datasetWizardSchemaMappingModeDescription' : undefined
        }
      >
        <p>
          {hideAwsGlueTable
            ? datasetWizardStrings.schemaMappingsDescriptionFlow3()
            : datasetWizardStrings.schemaMappingsDescription()}
        </p>
      </EuiText>
      <EuiSpacer size="l" />

      {hideAwsGlueTable ? (
        hasGeneratedSchema ? (
          <InferredSchemaMappingsEditor
            key={schemaEditorKey}
            control={control}
            hasSchemaModifications={hasSchemaModifications}
            onReset={handleResetInferredSchema}
          />
        ) : (
          <EuiButton
            data-test-subj="datasetWizardPullInferredSchema"
            onClick={() => {
              automaticFieldTypesField.onChange(
                seedAutomaticFieldTypesFromInferred(automaticSchemaSampleFields)
              );
              setHasGeneratedSchema(true);
            }}
          >
            {datasetWizardStrings.pullInferredSchemaButton()}
          </EuiButton>
        )
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
