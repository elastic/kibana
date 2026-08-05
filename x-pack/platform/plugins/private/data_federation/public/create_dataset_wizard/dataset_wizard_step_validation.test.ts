/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applySettingsForFormat } from '../create_dataset_flyout/dataset_settings_defaults';
import { emptyCreateDatasetSettingsFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import { emptyDatasetWizardFormValues } from './dataset_wizard_form_state';
import {
  getAdditionalSettingsStepFields,
  getSchemaMappingsStepFields,
  getWizardStepFields,
} from './dataset_wizard_step_validation';
import { ADDITIONAL_SETTINGS_STEP, LOGISTICS_STEP, SCHEMA_MAPPINGS_STEP } from './dataset_wizard_constants';

describe('dataset_wizard_step_validation', () => {
  it('returns logistics fields for step 1', () => {
    expect(getWizardStepFields(LOGISTICS_STEP, emptyDatasetWizardFormValues())).toEqual([
      'data_source',
      'name',
      'resource',
      'region',
    ]);
  });

  it('returns visible settings fields for step 2', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
    };

    expect(getAdditionalSettingsStepFields(values)).toEqual(
      expect.arrayContaining(['settings.delimiter', 'settings.max_field_size'])
    );
  });

  it('returns glue fields when AWS Glue table mode is selected', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      schema_mapping_mode: 'aws_glue_table' as const,
    };

    expect(getSchemaMappingsStepFields(values)).toEqual(['glue_database', 'glue_table_name']);
    expect(getWizardStepFields(SCHEMA_MAPPINGS_STEP, values)).toEqual([
      'glue_database',
      'glue_table_name',
    ]);
  });

  it('includes logistics and settings fields for review validation', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
    };

    expect(getWizardStepFields(ADDITIONAL_SETTINGS_STEP, values)).toEqual(
      getAdditionalSettingsStepFields(values)
    );
  });
});
