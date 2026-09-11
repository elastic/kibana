/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';

import type {
  CreateDatasetSettingsFormValues,
  DatasetPartitionDetectionFormValue,
} from '../create_dataset_flyout/create_dataset_flyout_form_state';
import type { DatasetSettingsFieldId } from '../create_dataset_flyout/dataset_settings_visibility';
import {
  isDatasetWizardFlow396,
  type DatasetWizardFlowVariant,
} from './dataset_wizard_flow_variant';
import { SCHEMA_MAPPING_SETTINGS_FIELD_IDS } from './schema_mapping_settings_fields';

/**
 * Settings that describe the resource path rather than the contents of the files, so they are
 * asked for beside the resource instead of among the format settings.
 */
const RESOURCE_OWNED_SETTINGS_FIELD_IDS: readonly DatasetSettingsFieldId[] = [
  'partition_detection',
  'partition_path',
];

export const getResourceOwnedSettingsFieldIds = (
  flowVariant: DatasetWizardFlowVariant
): readonly DatasetSettingsFieldId[] =>
  isDatasetWizardFlow396(flowVariant) ? RESOURCE_OWNED_SETTINGS_FIELD_IDS : [];

/** Fields summarized on other review columns (logistics / schema mappings). */
export const getReviewAdditionalSettingsExcludeFieldIds = (
  flowVariant: DatasetWizardFlowVariant
): readonly DatasetSettingsFieldId[] => [
  ...getResourceOwnedSettingsFieldIds(flowVariant),
  ...(isDatasetWizardFlow396(flowVariant) ? SCHEMA_MAPPING_SETTINGS_FIELD_IDS : []),
];

/**
 * Flow 3 9.6 only asks for a path when detection is Template. Ownership stays
 * both fields so a leftover path survives switching away from Template.
 */
export const getVisibleResourceOwnedSettingsFieldIds = (
  flowVariant: DatasetWizardFlowVariant,
  partitionDetection: DatasetPartitionDetectionFormValue
): readonly DatasetSettingsFieldId[] =>
  getResourceOwnedSettingsFieldIds(flowVariant).filter(
    (fieldId) => fieldId !== 'partition_path' || partitionDetection === 'template'
  );

/**
 * Reapplies the values owned by the resource step, which the format settings would otherwise
 * clear when the resource changes.
 */
export const keepResourceOwnedSettings = (
  next: CreateDatasetSettingsFormValues,
  current: CreateDatasetSettingsFormValues,
  fieldIds: readonly DatasetSettingsFieldId[]
): CreateDatasetSettingsFormValues => ({ ...next, ...pick(current, fieldIds) });
