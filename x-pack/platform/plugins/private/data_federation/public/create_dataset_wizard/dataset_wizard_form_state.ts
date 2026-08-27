/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSetWithName } from '../../common';
import type { CreateDatasetFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import {
  dataSetToFlyoutFormValues,
  emptyDatasetFlyoutFormValues,
} from '../create_dataset_flyout/dataset_flyout_initial_values';
import { EMPTY_SETTINGS_CUSTOM_JSON } from '../create_dataset_flyout/settings_custom_json_utils';

export const SCHEMA_MAPPING_MODES = ['automatic', 'aws_glue_table', 'manual'] as const;

export type SchemaMappingMode = (typeof SCHEMA_MAPPING_MODES)[number];

export interface DatasetWizardFormValues extends CreateDatasetFormValues {
  /** Prototype-only field; not persisted to the API yet. */
  region: string;
  /** Prototype-only field; not persisted to the API yet. */
  schema_mapping_mode: SchemaMappingMode;
  /** Prototype-only field; not persisted to the API yet. */
  manual_mappings: Record<string, object>;
  /**
   * Prototype-only mapped field types.
   * In Flow 3 this is only pinned (mapped) fields; everything else stays dynamic
   * when `dynamic_fields_enabled` is on.
   */
  automatic_field_types: Record<string, string>;
  /** Prototype-only. When off, only mapped fields are used (closed schema). */
  dynamic_fields_enabled: boolean;
  /** Prototype-only field; not persisted to the API yet. */
  glue_database: string;
  /** Prototype-only field; not persisted to the API yet. */
  glue_table_name: string;
  /** Prototype-only field; not persisted to the API yet. */
  glue_catalog_region: string;
  /** Prototype-only field; not persisted to the API yet. */
  glue_aws_account_id: string;
  /** Flow 3 optional JSON overrides for dataset settings. */
  settings_custom_json: string;
}

export const emptyDatasetWizardFormValues = (): DatasetWizardFormValues => ({
  ...emptyDatasetFlyoutFormValues(),
  region: '',
  schema_mapping_mode: 'automatic',
  manual_mappings: {},
  automatic_field_types: {},
  dynamic_fields_enabled: true,
  glue_database: '',
  glue_table_name: '',
  glue_catalog_region: '',
  glue_aws_account_id: '',
  settings_custom_json: EMPTY_SETTINGS_CUSTOM_JSON,
});

export const dataSetToWizardFormValues = (data: DataSetWithName): DatasetWizardFormValues => ({
  ...dataSetToFlyoutFormValues(data),
  region: '',
  schema_mapping_mode: 'automatic',
  manual_mappings: {},
  automatic_field_types: {},
  dynamic_fields_enabled: true,
  glue_database: '',
  glue_table_name: '',
  glue_catalog_region: '',
  glue_aws_account_id: '',
  settings_custom_json: EMPTY_SETTINGS_CUSTOM_JSON,
});
