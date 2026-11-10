/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { buildDatasetPayload } from './build_dataset_payload';
import type { CreateDatasetSettingsFormValues } from './create_dataset_form_state';
import { emptyDatasetFormValues } from './dataset_form_initial_values';

const buildSettings = (
  settings: Partial<CreateDatasetSettingsFormValues>,
  unmanagedSettings: SerializableRecord
) => {
  const values = emptyDatasetFormValues();
  return buildDatasetPayload({
    ...values,
    name: 'logs',
    data_source: 'source-1',
    resource: 's3://bucket/*',
    settings: { ...values.settings, ...settings },
    ui: { ...values.ui, unmanagedSettings },
  }).settings;
};

describe('buildDatasetPayload', () => {
  describe('WHEN unmanaged settings are compatible with the form settings', () => {
    it('SHOULD pass them through unchanged', () => {
      expect(
        buildSettings(
          { format: 'csv' },
          {
            comment: '#',
            multi_value_syntax: 'brackets',
            max_field_size: 2048,
            file_sort_by: 'name',
            region: 'us-east-1',
          }
        )
      ).toEqual({
        format: 'csv',
        comment: '#',
        multi_value_syntax: 'brackets',
        max_field_size: 2048,
        file_sort_by: 'name',
        region: 'us-east-1',
      });
    });
  });

  describe('WHEN an unmanaged setting is not supported for the format', () => {
    it.each([
      ['ndjson', { comment: '#', multi_value_syntax: 'none', max_field_size: 10 }],
      ['parquet', { schema_sample_size: 100, segment_size: '1mb' }],
      ['csv', { segment_size: '1mb' }],
      ['', { schema_sample_size: 100, comment: '#' }],
    ] as const)('SHOULD omit it for format %p', (format, unmanagedSettings) => {
      expect(buildSettings({ format }, { ...unmanagedSettings, region: 'us-east-1' })).toEqual({
        ...(format ? { format } : {}),
        region: 'us-east-1',
      });
    });

    it('SHOULD keep settings shared by the format', () => {
      expect(
        buildSettings({ format: 'ndjson' }, { schema_sample_size: 100, segment_size: '1mb' })
      ).toEqual({ format: 'ndjson', schema_sample_size: 100, segment_size: '1mb' });
    });
  });

  describe('WHEN schema resolution is not first_file_wins', () => {
    it.each(['strict', 'union_by_name'] as const)(
      'SHOULD omit file_sort_by and file_order for %p',
      (schemaResolution) => {
        expect(
          buildSettings(
            { format: 'parquet', schema_resolution: schemaResolution },
            { file_sort_by: 'name', file_order: 'desc' }
          )
        ).toEqual({ format: 'parquet', schema_resolution: schemaResolution });
      }
    );

    it('SHOULD keep file_sort_by and file_order for first_file_wins', () => {
      expect(
        buildSettings(
          { format: 'parquet', schema_resolution: 'first_file_wins' },
          { file_sort_by: 'name', file_order: 'desc' }
        )
      ).toEqual({
        format: 'parquet',
        schema_resolution: 'first_file_wins',
        file_sort_by: 'name',
        file_order: 'desc',
      });
    });
  });

  describe('WHEN multi_value_syntax is brackets', () => {
    it.each([
      ['plain mode', { format: 'csv', mode: 'plain' }],
      ['escaped mode', { format: 'tsv', mode: 'escaped' }],
      ['quote none', { format: 'csv', quote: 'none' }],
    ] as const)('SHOULD omit it when quoting is off via %s', (_label, settings) => {
      expect(buildSettings(settings, { multi_value_syntax: 'brackets' })).toEqual(settings);
    });

    it.each([
      ['TSV without a mode', { format: 'tsv' }],
      ['plain mode with an explicit quote', { format: 'tsv', mode: 'plain', quote: "'" }],
      ['CSV plain mode with the default quote', { format: 'csv', mode: 'plain', quote: '"' }],
      ['quoted mode', { format: 'tsv', mode: 'quoted' }],
    ] as const)('SHOULD keep it for %s', (_label, settings) => {
      expect(buildSettings(settings, { multi_value_syntax: 'brackets' })).toEqual({
        ...settings,
        multi_value_syntax: 'brackets',
      });
    });

    it('SHOULD keep multi_value_syntax none when quoting is off', () => {
      expect(
        buildSettings({ format: 'csv', mode: 'plain' }, { multi_value_syntax: 'none' })
      ).toEqual({ format: 'csv', mode: 'plain', multi_value_syntax: 'none' });
    });
  });
});
