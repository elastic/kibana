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
  LOGISTICS_STEP,
  REVIEW_STEP,
  SCHEMA_MAPPINGS_STEP,
} from './dataset_wizard_constants';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import type { DatasetWizardStep } from './dataset_wizard_step_url';

const LOGISTICS_STEP_FIELDS: Array<FieldPath<DatasetWizardFormValues>> = [
  'data_source',
  'name',
  'resource',
  'region',
];

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
  values: DatasetWizardFormValues
): Array<FieldPath<DatasetWizardFormValues>> => {
  const { format, error_mode: errorMode } = values.settings;

  if (!isKnownFormat(format)) {
    return [];
  }

  const fields = DATASET_SETTINGS_FIELD_IDS.filter(
    (fieldId) =>
      isFieldVisibleForFormat(fieldId, format) && isFieldVisibleForErrorMode(fieldId, errorMode)
  ).map((fieldId) => `settings.${fieldId}` as FieldPath<DatasetWizardFormValues>);

  return fields;
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
  values: DatasetWizardFormValues
): Array<FieldPath<DatasetWizardFormValues>> => {
  switch (step) {
    case LOGISTICS_STEP:
      return LOGISTICS_STEP_FIELDS;
    case ADDITIONAL_SETTINGS_STEP:
      return getAdditionalSettingsStepFields(values);
    case SCHEMA_MAPPINGS_STEP:
      return getSchemaMappingsStepFields(values);
    case REVIEW_STEP:
      return [
        ...LOGISTICS_STEP_FIELDS,
        ...getAdditionalSettingsStepFields(values),
        ...getSchemaMappingsStepFields(values),
      ];
  }
};

export const getWizardStepsThrough = (targetStep: DatasetWizardStep): DatasetWizardStep[] => {
  const steps: DatasetWizardStep[] = [
    LOGISTICS_STEP,
    ADDITIONAL_SETTINGS_STEP,
    SCHEMA_MAPPINGS_STEP,
    REVIEW_STEP,
  ];

  return steps.filter((step) => step <= targetStep);
};

export const findFirstInvalidWizardStep = async ({
  targetStep,
  values,
  trigger,
}: {
  targetStep: DatasetWizardStep;
  values: DatasetWizardFormValues;
  trigger: (
    fields: Array<FieldPath<DatasetWizardFormValues>>
  ) => Promise<boolean>;
}): Promise<DatasetWizardStep | undefined> => {
  for (const step of getWizardStepsThrough(targetStep)) {
    if (step === LOGISTICS_STEP) {
      const isValid = await trigger(getWizardStepFields(step, values));
      if (!isValid) {
        return LOGISTICS_STEP;
      }
      continue;
    }

    const isValid = await trigger(getWizardStepFields(step, values));
    if (!isValid) {
      return step;
    }
  }

  return undefined;
};
