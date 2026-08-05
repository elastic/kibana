/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateDatasetSettingsFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from './dataset_wizard_form_state';

export const getWizardFormDraftStorageKey = (isEditMode: boolean, datasetName?: string): string =>
  isEditMode && datasetName
    ? `dataFederation.datasetWizard.edit.${datasetName}`
    : 'dataFederation.datasetWizard.create';

const isRecordOfStrings = (value: unknown, keys: readonly string[]): value is Record<string, string> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return keys.every((key) => typeof record[key] === 'string');
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const isDatasetWizardFormValues = (value: unknown): value is DatasetWizardFormValues => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const empty = emptyDatasetWizardFormValues();
  const candidate = value as DatasetWizardFormValues;

  if (typeof candidate.region !== 'string') {
    return false;
  }

  if (
    typeof candidate.glue_database !== 'string' ||
    typeof candidate.glue_table_name !== 'string' ||
    typeof candidate.glue_catalog_region !== 'string' ||
    typeof candidate.glue_aws_account_id !== 'string'
  ) {
    return false;
  }

  if (
    candidate.schema_mapping_mode !== 'automatic' &&
    candidate.schema_mapping_mode !== 'aws_glue_table' &&
    candidate.schema_mapping_mode !== 'manual'
  ) {
    return false;
  }

  if (!isRecord(candidate.manual_mappings)) {
    return false;
  }

  if (
    !Object.values(candidate.manual_mappings).every(
      (mappingValue) => mappingValue !== null && typeof mappingValue === 'object'
    )
  ) {
    return false;
  }

  if (
    !isRecordOfStrings(candidate, ['name', 'description', 'data_source', 'resource'] as const)
  ) {
    return false;
  }

  return isRecordOfStrings(
    candidate.settings,
    Object.keys(empty.settings) as Array<keyof CreateDatasetSettingsFormValues>
  );
};

export const mergeWizardFormValues = (
  base: DatasetWizardFormValues,
  draft: DatasetWizardFormValues
): DatasetWizardFormValues => ({
  ...base,
  ...draft,
  settings: {
    ...base.settings,
    ...draft.settings,
  },
});

export const loadWizardFormDraft = (storageKey: string): DatasetWizardFormValues | undefined => {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      return undefined;
    }

    const parsed: unknown = JSON.parse(raw);
    return isDatasetWizardFormValues(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const saveWizardFormDraft = (storageKey: string, values: DatasetWizardFormValues): void => {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(values));
  } catch {
    // Ignore quota or privacy mode errors for prototype draft persistence.
  }
};

export const clearWizardFormDraft = (storageKey: string): void => {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore storage access errors.
  }
};
