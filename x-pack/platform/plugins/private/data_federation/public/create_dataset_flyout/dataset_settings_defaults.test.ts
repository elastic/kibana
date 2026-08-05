/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  emptyCreateDatasetSettingsFormValues,
  type CreateDatasetSettingsFormValues,
} from './create_dataset_flyout_form_state';
import { applySettingsForFormat } from './dataset_settings_defaults';

describe('applySettingsForFormat', () => {
  it('applies csv defaults to an empty form', () => {
    expect(applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv')).toEqual({
      ...emptyCreateDatasetSettingsFormValues(),
      format: 'csv',
      delimiter: ',',
      encoding: 'UTF-8',
      column_prefix: 'col',
      schema_sample_size: '20000',
      max_error_ratio: '0.0',
    });
  });

  it('applies tsv defaults including tab delimiter', () => {
    expect(applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'tsv')).toMatchObject({
      format: 'tsv',
      delimiter: '\t',
      encoding: 'UTF-8',
      schema_sample_size: '20000',
    });
  });

  it('replaces csv defaults when switching to tsv', () => {
    const csvSettings = applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv');

    expect(applySettingsForFormat(csvSettings, 'tsv')).toMatchObject({
      format: 'tsv',
      delimiter: '\t',
      encoding: 'UTF-8',
      schema_sample_size: '20000',
    });
  });

  it('clears csv-only fields when switching to parquet', () => {
    const csvSettings = applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv');

    expect(applySettingsForFormat(csvSettings, 'parquet')).toEqual({
      ...emptyCreateDatasetSettingsFormValues(),
      format: 'parquet',
    });
  });

  it('preserves shared universal values when switching formats', () => {
    const csvSettings: CreateDatasetSettingsFormValues = {
      ...applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
      partition_detection: 'hive',
      schema_resolution: 'strict',
    };

    expect(applySettingsForFormat(csvSettings, 'ndjson')).toMatchObject({
      format: 'ndjson',
      partition_detection: 'hive',
      schema_resolution: 'strict',
      schema_sample_size: '20000',
      delimiter: '',
      encoding: '',
    });
  });

  it('preserves user-entered shared fields without format defaults', () => {
    const csvSettings: CreateDatasetSettingsFormValues = {
      ...applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
      datetime_format: 'yyyy-MM-dd',
    };

    expect(applySettingsForFormat(csvSettings, 'ndjson')).toMatchObject({
      format: 'ndjson',
      datetime_format: 'yyyy-MM-dd',
      schema_sample_size: '20000',
    });
  });
});
