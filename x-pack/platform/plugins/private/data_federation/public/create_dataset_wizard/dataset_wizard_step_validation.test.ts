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
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_3,
  DATASET_WIZARD_FLOW_VARIANT_3_9_6,
} from './dataset_wizard_flow_variant';
import {
  findFirstInvalidWizardStep,
  getAdditionalSettingsStepFields,
  getSchemaMappingsStepFields,
  getWizardStepFields,
} from './dataset_wizard_step_validation';
import {
  ADDITIONAL_SETTINGS_STEP,
  FLOW_3_REVIEW_STEP,
  LOGISTICS_STEP,
  PREVIEW_RESULTS_STEP,
  SCHEMA_MAPPINGS_STEP,
} from './dataset_wizard_constants';

describe('dataset_wizard_step_validation', () => {
  it('returns logistics fields including region for step 1 in flow 1', () => {
    expect(getWizardStepFields(LOGISTICS_STEP, emptyDatasetWizardFormValues())).toEqual([
      'data_source',
      'name',
      'resource',
      'region',
    ]);
  });

  it('moves region to additional settings fields in flow 3', () => {
    const values = emptyDatasetWizardFormValues();

    expect(getWizardStepFields(LOGISTICS_STEP, values, DATASET_WIZARD_FLOW_VARIANT_3)).toEqual([
      'data_source',
      'name',
      'resource',
    ]);
    expect(
      getWizardStepFields(ADDITIONAL_SETTINGS_STEP, values, DATASET_WIZARD_FLOW_VARIANT_3)
    ).toEqual(['region']);
    expect(getAdditionalSettingsStepFields(values, DATASET_WIZARD_FLOW_VARIANT_1)).toEqual([]);
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

  it('does not validate region when landing on additional settings in flow 3', async () => {
    const trigger = jest.fn(async (fields: string[]) => !fields.includes('region'));
    const values = {
      ...emptyDatasetWizardFormValues(),
      data_source: 'source-1',
      name: 'my-dataset',
      resource: 's3://bucket/data.csv',
    };

    await expect(
      findFirstInvalidWizardStep({
        targetStep: ADDITIONAL_SETTINGS_STEP,
        values,
        trigger,
        flowVariant: DATASET_WIZARD_FLOW_VARIANT_3,
      })
    ).resolves.toBeUndefined();

    expect(trigger).not.toHaveBeenCalledWith(expect.arrayContaining(['region']));
  });

  it('validates region when leaving additional settings in flow 3', async () => {
    const trigger = jest.fn(async (fields: string[]) => !fields.includes('region'));
    const values = {
      ...emptyDatasetWizardFormValues(),
      data_source: 'source-1',
      name: 'my-dataset',
      resource: 's3://bucket/data.csv',
    };

    await expect(
      findFirstInvalidWizardStep({
        targetStep: SCHEMA_MAPPINGS_STEP,
        values,
        trigger,
        flowVariant: DATASET_WIZARD_FLOW_VARIANT_3,
      })
    ).resolves.toBe(ADDITIONAL_SETTINGS_STEP);

    expect(trigger).toHaveBeenCalledWith(expect.arrayContaining(['region']));
  });

  it('does not require fields on the flow 3 preview results step', () => {
    const values = emptyDatasetWizardFormValues();

    expect(
      getWizardStepFields(PREVIEW_RESULTS_STEP, values, DATASET_WIZARD_FLOW_VARIANT_3)
    ).toEqual([]);
    expect(getWizardStepFields(FLOW_3_REVIEW_STEP, values, DATASET_WIZARD_FLOW_VARIANT_3)).toEqual(
      expect.arrayContaining(['data_source', 'name', 'resource', 'region'])
    );
  });

  it('treats step 4 as review in flow 3 9.6', () => {
    const values = emptyDatasetWizardFormValues();

    expect(
      getWizardStepFields(PREVIEW_RESULTS_STEP, values, DATASET_WIZARD_FLOW_VARIANT_3_9_6)
    ).toEqual(expect.arrayContaining(['data_source', 'name', 'resource', 'region']));
  });
});
