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
  buildTestConfigurationPreviewRows,
  getTestConfigurationPreviewFields,
  TEST_CONFIGURATION_PREVIEW_MIN_COLUMN_COUNT,
  TEST_CONFIGURATION_PREVIEW_ROW_COUNT,
} from './test_configuration_preview_utils';

describe('test_configuration_preview_utils', () => {
  it('returns at least twelve csv columns inferred from the column prefix', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
    };

    const fields = getTestConfigurationPreviewFields(values);

    expect(fields).toHaveLength(TEST_CONFIGURATION_PREVIEW_MIN_COLUMN_COUNT);
    expect(fields.map((field) => field.name)).toEqual([
      'col1',
      'col2',
      'col3',
      'col4',
      'col5',
      'col6',
      'col7',
      'col8',
      'col9',
      'col10',
      'col11',
      'col12',
    ]);
  });

  it('returns at least twelve structured columns for parquet datasets', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
    };

    const fields = getTestConfigurationPreviewFields(values);

    expect(fields.length).toBeGreaterThanOrEqual(TEST_CONFIGURATION_PREVIEW_MIN_COLUMN_COUNT);
    expect(fields[0]).toEqual({ name: '@timestamp', type: 'date' });
    expect(fields.some((field) => field.name === 'process.pid')).toBe(true);
  });

  it('mixes manual mapping fields with inferred columns in manual mode', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      schema_mapping_mode: 'manual' as const,
      manual_mappings: {
        properties: {
          host: { type: 'keyword' },
          bytes: { type: 'long' },
        },
      },
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
    };

    const fields = getTestConfigurationPreviewFields(values);

    expect(fields.length).toBeGreaterThanOrEqual(TEST_CONFIGURATION_PREVIEW_MIN_COLUMN_COUNT);
    expect(fields.slice(0, 2)).toEqual([
      { name: 'host', type: 'keyword' },
      { name: 'bytes', type: 'long' },
    ]);
    expect(fields.some((field) => field.name === '@timestamp')).toBe(true);
    expect(fields.some((field) => field.name === 'message')).toBe(true);
  });

  it('builds ten mock rows for the preview table', () => {
    const fields = [
      { name: '@timestamp', type: 'date' },
      { name: 'message', type: 'text' },
    ];

    const rows = buildTestConfigurationPreviewRows(fields);

    expect(rows).toHaveLength(TEST_CONFIGURATION_PREVIEW_ROW_COUNT);
    expect(rows[0]['@timestamp']).toBe('2026-08-05T12:00:00.000Z');
    expect(rows[0].message).toBe('Sample log event 1');
  });
});
