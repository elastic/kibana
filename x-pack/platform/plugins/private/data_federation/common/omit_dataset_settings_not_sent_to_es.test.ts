/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  omitDatasetFieldsNotSentToEs,
  omitDatasetSettingsNotSentToEs,
} from './omit_dataset_settings_not_sent_to_es';

describe('omitDatasetSettingsNotSentToEs', () => {
  it('drops optimized_reader and late_materialization', () => {
    expect(
      omitDatasetSettingsNotSentToEs({
        format: 'parquet',
        optimized_reader: true,
        late_materialization: true,
      })
    ).toEqual({ format: 'parquet' });
  });

  it('returns undefined when only those settings remain', () => {
    expect(
      omitDatasetSettingsNotSentToEs({
        optimized_reader: false,
        late_materialization: false,
      })
    ).toBeUndefined();
  });
});

describe('omitDatasetFieldsNotSentToEs', () => {
  it('drops the UI-only parquet settings from the dataset body', () => {
    expect(
      omitDatasetFieldsNotSentToEs({
        data_source: 'obs-prod-s3',
        resource: 's3://obs-logs-prod/**/*.parquet',
        settings: {
          format: 'parquet',
          optimized_reader: true,
          late_materialization: true,
        },
      })
    ).toEqual({
      data_source: 'obs-prod-s3',
      resource: 's3://obs-logs-prod/**/*.parquet',
      settings: { format: 'parquet' },
    });
  });
});
