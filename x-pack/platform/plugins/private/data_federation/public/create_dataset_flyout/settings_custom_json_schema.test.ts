/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDefaultSettingsCustomJson,
  getDatasetSettingsCustomJsonSchema,
  getVisibleCustomJsonApiKeys,
} from './settings_custom_json_schema';

describe('settings_custom_json_schema', () => {
  describe('getVisibleCustomJsonApiKeys', () => {
    it('includes csv-specific keys for csv format', () => {
      expect(getVisibleCustomJsonApiKeys('csv', 'fail_fast')).toEqual(
        expect.arrayContaining(['delimiter', 'quote', 'max_field_size', 'target_split_size'])
      );
      expect(getVisibleCustomJsonApiKeys('csv', 'fail_fast')).not.toContain('segment_size');
      expect(getVisibleCustomJsonApiKeys('csv', 'fail_fast')).not.toContain('max_errors');
    });

    it('includes error limit keys when error mode allows them', () => {
      expect(getVisibleCustomJsonApiKeys('csv', 'skip_row')).toEqual(
        expect.arrayContaining(['max_errors', 'max_error_ratio'])
      );
    });

    it('includes parquet-specific keys for parquet format', () => {
      expect(getVisibleCustomJsonApiKeys('parquet', 'fail_fast')).toEqual(
        expect.arrayContaining(['optimized_reader', 'late_materialization'])
      );
      expect(getVisibleCustomJsonApiKeys('parquet', 'fail_fast')).not.toContain('delimiter');
    });

    it('includes ndjson segment size', () => {
      expect(getVisibleCustomJsonApiKeys('ndjson', 'fail_fast')).toEqual(
        expect.arrayContaining(['segment_size'])
      );
    });
  });

  describe('getDatasetSettingsCustomJsonSchema', () => {
    it('builds a schema with typed properties for visible keys', () => {
      const schema = getDatasetSettingsCustomJsonSchema('csv', 'skip_row');

      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
      expect(schema.properties?.quote).toMatchObject({
        type: 'string',
      });
      expect(schema.properties?.error_mode).toMatchObject({
        type: 'string',
        enum: ['fail_fast', 'skip_row', 'null_field'],
      });
      expect(schema.properties?.header_row).toMatchObject({
        type: 'boolean',
      });
      expect(schema.properties?.max_errors).toMatchObject({
        type: 'integer',
        minimum: 0,
      });
      expect(schema.properties?.segment_size).toBeUndefined();
    });

    it('updates visible properties when format changes', () => {
      const csvSchema = getDatasetSettingsCustomJsonSchema('csv', 'fail_fast');
      const parquetSchema = getDatasetSettingsCustomJsonSchema('parquet', 'fail_fast');

      expect(csvSchema.properties?.delimiter).toBeDefined();
      expect(parquetSchema.properties?.delimiter).toBeUndefined();
      expect(parquetSchema.properties?.optimized_reader).toBeDefined();
    });
  });

  describe('buildDefaultSettingsCustomJson', () => {
    it('includes all visible csv settings with api-typed defaults', () => {
      const json = buildDefaultSettingsCustomJson('csv', 'fail_fast');
      const parsed = JSON.parse(json) as Record<string, unknown>;

      expect(parsed).toMatchObject({
        partition_detection: 'auto',
        schema_resolution: 'union_by_name',
        hive_partitioning: false,
        delimiter: ',',
        mode: 'quoted',
        header_row: true,
        error_mode: 'fail_fast',
        quote: '"',
      });
      expect(parsed.max_errors).toBeUndefined();
      expect(parsed.target_split_size).toBeUndefined();
    });

    it('includes error limit fields when error mode allows them', () => {
      const json = buildDefaultSettingsCustomJson('csv', 'skip_row');
      const parsed = JSON.parse(json) as Record<string, unknown>;

      expect(parsed.max_errors).toBe(0);
      expect(parsed.max_error_ratio).toBe(0);
    });

    it('includes parquet-specific settings for parquet format', () => {
      const json = buildDefaultSettingsCustomJson('parquet', 'fail_fast');
      const parsed = JSON.parse(json) as Record<string, unknown>;

      expect(parsed.optimized_reader).toBe(true);
      expect(parsed.late_materialization).toBe(true);
      expect(parsed.delimiter).toBeUndefined();
    });
  });
});
