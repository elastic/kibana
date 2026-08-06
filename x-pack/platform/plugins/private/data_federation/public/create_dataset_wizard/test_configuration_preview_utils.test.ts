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
  it('returns realistic csv columns when header row is enabled', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
    };

    const fields = getTestConfigurationPreviewFields(values);

    expect(fields).toHaveLength(TEST_CONFIGURATION_PREVIEW_MIN_COLUMN_COUNT);
    expect(fields.map((field) => field.name)).toEqual([
      'timestamp',
      'message',
      'level',
      'host',
      'service',
      'status_code',
      'duration_ms',
      'user',
      'region',
      'error_type',
      'log_path',
      'process_pid',
    ]);
    expect(fields[0]).toEqual({ name: 'timestamp', type: 'date' });
    expect(fields[5]).toEqual({ name: 'status_code', type: 'long' });
  });

  it('returns prefixed csv columns with realistic types when header row is disabled', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      settings: {
        ...applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
        header_row: 'false',
        column_prefix: 'col',
      },
    };

    const fields = getTestConfigurationPreviewFields(values);

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
    expect(fields[0]).toEqual({ name: 'col1', type: 'date' });
    expect(fields[1]).toEqual({ name: 'col2', type: 'text' });
    expect(fields[5]).toEqual({ name: 'col6', type: 'long' });
  });

  it('returns realistic tsv columns when header row is enabled', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'tsv'),
    };

    const fields = getTestConfigurationPreviewFields(values);

    expect(fields[0]).toEqual({ name: 'timestamp', type: 'date' });
    expect(fields.some((field) => field.name === 'duration_ms')).toBe(true);
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

  it('returns realistic ndjson columns', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'ndjson'),
    };

    const fields = getTestConfigurationPreviewFields(values);

    expect(fields[0]).toEqual({ name: '@timestamp', type: 'date' });
    expect(fields.some((field) => field.name === 'log.level')).toBe(true);
    expect(fields.some((field) => field.name === 'error.message')).toBe(true);
  });

  it('returns structured columns for orc datasets', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'orc'),
    };

    const fields = getTestConfigurationPreviewFields(values);

    expect(fields.some((field) => field.name === '@timestamp')).toBe(true);
    expect(fields.some((field) => field.name === 'host.name')).toBe(true);
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

  it('builds realistic csv preview row values', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
    };

    const fields = getTestConfigurationPreviewFields(values);
    const rows = buildTestConfigurationPreviewRows(fields);

    expect(rows[0].timestamp).toBe('2026-08-05T12:00:00.000Z');
    expect(rows[0].level).toBe('info');
    expect(rows[0].status_code).toBe(200);
    expect(rows[0].host).toBe('host-1.example.com');
  });

  it('builds realistic values for prefixed csv columns without headers', () => {
    const fields = getTestConfigurationPreviewFields({
      ...emptyDatasetWizardFormValues(),
      settings: {
        ...applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
        header_row: 'false',
      },
    });
    const rows = buildTestConfigurationPreviewRows(fields);

    expect(rows[0].col1).toBe('2026-08-05T12:00:00.000Z');
    expect(rows[0].col2).toBe('Sample log event 1');
    expect(rows[0].col3).toBe('info');
    expect(rows[0].col6).toBe(200);
  });
});
