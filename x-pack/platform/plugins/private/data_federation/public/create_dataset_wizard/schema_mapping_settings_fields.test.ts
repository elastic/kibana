/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSchemaMappingSettingsFieldIds,
  SCHEMA_MAPPING_SETTINGS_FIELD_IDS,
} from './schema_mapping_settings_fields';

describe('schema_mapping_settings_fields', () => {
  it('includes schema mapping settings for parquet and ndjson', () => {
    expect(SCHEMA_MAPPING_SETTINGS_FIELD_IDS).toEqual(['schema_sample_size', 'schema_resolution']);
    expect(getSchemaMappingSettingsFieldIds('parquet')).toEqual(['schema_resolution']);
    expect(getSchemaMappingSettingsFieldIds('ndjson')).toEqual([
      'schema_sample_size',
      'schema_resolution',
    ]);
  });

  it('returns no schema mapping settings for csv', () => {
    expect(getSchemaMappingSettingsFieldIds('csv')).toEqual([]);
  });

  it('returns all schema mapping settings for every format in flow 3 9.6', () => {
    const formats = ['csv', 'tsv', 'ndjson', 'parquet', 'orc'] as const;

    formats.forEach((format) => {
      expect(getSchemaMappingSettingsFieldIds(format, '', { showForAllFormats: true })).toEqual([
        'schema_sample_size',
        'schema_resolution',
      ]);
    });
  });
});
