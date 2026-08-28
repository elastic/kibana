/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldPath } from 'react-hook-form';

import type { DatasetFormatFormValue } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import {
  DATASET_SETTINGS_FIELD_IDS,
  isFieldVisibleForErrorMode,
  isFieldVisibleForFormat,
} from '../create_dataset_flyout/dataset_settings_visibility';
import {
  ADDITIONAL_SETTINGS_STEP,
  DATA_SOURCE_STEP,
  FLOW_3_REVIEW_STEP,
  LOGISTICS_STEP,
  PREVIEW_RESULTS_STEP,
  SCHEMA_MAPPINGS_STEP,
} from './dataset_wizard_constants';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  hasDatasetWizardPreviewResultsStep,
  isDatasetWizardFlow3,
  isDatasetWizardFlow4,
  type DatasetWizardFlowVariant,
} from './dataset_wizard_flow_variant';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import {
  getWizardStepPosition,
  getWizardSteps,
  type DatasetWizardStep,
} from './dataset_wizard_step_url';

const LOGISTICS_STEP_FIELDS_WITHOUT_REGION: Array<FieldPath<DatasetWizardFormValues>> = [
  'data_source',
  'name',
  'resource',
];

const LOGISTICS_STEP_FIELDS: Array<FieldPath<DatasetWizardFormValues>> = [
  ...LOGISTICS_STEP_FIELDS_WITHOUT_REGION,
  'region',
];

/** Flow 4 step 1 only asks for the file URI; the data source moves to its own step. */
const FILE_STEP_FIELDS: Array<FieldPath<DatasetWizardFormValues>> = ['resource'];

const getLogisticsStepFields = (
  flowVariant: DatasetWizardFlowVariant
): Array<FieldPath<DatasetWizardFormValues>> =>
  isDatasetWizardFlow3(flowVariant) ? LOGISTICS_STEP_FIELDS_WITHOUT_REGION : LOGISTICS_STEP_FIELDS;

const GLUE_STEP_FIELDS: Array<FieldPath<DatasetWizardFormValues>> = [
  'glue_database',
  'glue_table_name',
];

const isKnownFormat = (format: string): format is Exclude<DatasetFormatFormValue, ''> =>
  format === 'csv' ||
  format === 'tsv' ||
  format === 'parquet' ||
  format === 'ndjson' ||
  format === 'orc';

export const getAdditionalSettingsStepFields = (
  values: DatasetWizardFormValues,
  flowVariant: DatasetWizardFlowVariant = DATASET_WIZARD_FLOW_VARIANT_1
): Array<FieldPath<DatasetWizardFormValues>> => {
  const { format, error_mode: errorMode } = values.settings;
  // Flow 4 detects the region from the bucket on its data source step, so it has
  // no region field to validate here.
  const regionFields: Array<FieldPath<DatasetWizardFormValues>> =
    isDatasetWizardFlow3(flowVariant) && !isDatasetWizardFlow4(flowVariant) ? ['region'] : [];

  if (!isKnownFormat(format)) {
    return regionFields;
  }

  const fields = DATASET_SETTINGS_FIELD_IDS.filter(
    (fieldId) =>
      isFieldVisibleForFormat(fieldId, format) && isFieldVisibleForErrorMode(fieldId, errorMode)
  ).map((fieldId) => `settings.${fieldId}` as FieldPath<DatasetWizardFormValues>);

  const customJsonField: Array<FieldPath<DatasetWizardFormValues>> = isDatasetWizardFlow3(
    flowVariant
  )
    ? ['settings_custom_json']
    : [];

  return [...regionFields, ...fields, ...customJsonField];
};

export const getSchemaMappingsStepFields = (
  values: DatasetWizardFormValues
): Array<FieldPath<DatasetWizardFormValues>> => {
  if (values.schema_mapping_mode !== 'aws_glue_table') {
    return [];
  }

  return GLUE_STEP_FIELDS;
};

export const getWizardStepFields = (
  step: DatasetWizardStep,
  values: DatasetWizardFormValues,
  flowVariant: DatasetWizardFlowVariant = DATASET_WIZARD_FLOW_VARIANT_1
): Array<FieldPath<DatasetWizardFormValues>> => {
  switch (step) {
    case LOGISTICS_STEP:
      return isDatasetWizardFlow4(flowVariant)
        ? FILE_STEP_FIELDS
        : getLogisticsStepFields(flowVariant);
    // The flow 4 data source step keeps its own form, so it has no wizard fields
    // to validate here.
    case DATA_SOURCE_STEP:
      return [];
    case ADDITIONAL_SETTINGS_STEP:
      return getAdditionalSettingsStepFields(values, flowVariant);
    case SCHEMA_MAPPINGS_STEP:
      return getSchemaMappingsStepFields(values);
    case PREVIEW_RESULTS_STEP:
      return hasDatasetWizardPreviewResultsStep(flowVariant)
        ? []
        : [
            ...getLogisticsStepFields(flowVariant),
            ...getAdditionalSettingsStepFields(values, flowVariant),
            ...getSchemaMappingsStepFields(values),
          ];
    case FLOW_3_REVIEW_STEP:
      return [
        ...getLogisticsStepFields(flowVariant),
        ...getAdditionalSettingsStepFields(values, flowVariant),
        ...getSchemaMappingsStepFields(values),
      ];
  }
};

export const getWizardStepsThrough = (
  targetStep: DatasetWizardStep,
  flowVariant: DatasetWizardFlowVariant = DATASET_WIZARD_FLOW_VARIANT_1
): DatasetWizardStep[] => {
  const targetPosition = getWizardStepPosition(targetStep, flowVariant);

  return getWizardSteps(flowVariant).filter(
    (step) => getWizardStepPosition(step, flowVariant) <= targetPosition
  );
};

const getFieldsToValidateForStep = (
  step: DatasetWizardStep,
  targetStep: DatasetWizardStep,
  values: DatasetWizardFormValues,
  flowVariant: DatasetWizardFlowVariant
): Array<FieldPath<DatasetWizardFormValues>> => {
  const fields = getWizardStepFields(step, values, flowVariant);

  // Flow 3 keeps region on additional settings. Validate it when leaving that
  // step, not when first landing on it (URL sync / stepper).
  if (
    isDatasetWizardFlow3(flowVariant) &&
    step === ADDITIONAL_SETTINGS_STEP &&
    targetStep === ADDITIONAL_SETTINGS_STEP
  ) {
    return fields.filter((field) => field !== 'region');
  }

  return fields;
};

export const findFirstInvalidWizardStep = async ({
  targetStep,
  values,
  trigger,
  flowVariant = DATASET_WIZARD_FLOW_VARIANT_1,
}: {
  targetStep: DatasetWizardStep;
  values: DatasetWizardFormValues;
  trigger: (fields: Array<FieldPath<DatasetWizardFormValues>>) => Promise<boolean>;
  flowVariant?: DatasetWizardFlowVariant;
}): Promise<DatasetWizardStep | undefined> => {
  for (const step of getWizardStepsThrough(targetStep, flowVariant)) {
    const fields = getFieldsToValidateForStep(step, targetStep, values, flowVariant);
    if (fields.length === 0) {
      continue;
    }

    const isValid = await trigger(fields);
    if (!isValid) {
      return step;
    }
  }

  return undefined;
};
