/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDatasetSettingsFromFormValues,
  emptyCreateDatasetSettingsFormValues,
  type CreateDatasetSettingsFormValues,
} from './create_dataset_form_state';
import { getSettingsReviewItems } from './review_settings_items';
import type { DatasetSettings } from '../../common';

const mergedSettingsFromForm = (
  settings: CreateDatasetSettingsFormValues,
  unmanagedSettings: DatasetSettings
): DatasetSettings | undefined => {
  const applied = buildDatasetSettingsFromFormValues(settings) ?? {};
  const merged = { ...applied, ...unmanagedSettings };
  return Object.keys(merged).length > 0 ? merged : undefined;
};

const allSettingsForFormat = (format: CreateDatasetSettingsFormValues['format']) => {
  const settings: CreateDatasetSettingsFormValues = {
    ...emptyCreateDatasetSettingsFormValues(),
    format,
    file_exclusions: ['**/skip/*'],
    partition_detection: 'hive',
    schema_resolution: 'union_by_name',
    partition_path: 'year=*/month=*',
    hive_partitioning: 'true',
    optimized_reader: 'false',
    late_materialization: 'true',
    delimiter: ';',
    mode: 'quoted',
    header_row: 'false',
    skip_rows: '2',
    datetime_format: 'yyyy-MM-dd',
    null_value: 'NA',
    encoding: 'UTF-16',
    quote: "'",
    escape: '/',
    column_prefix: 'field',
    trim_spaces: true,
    error_mode: 'skip_row',
    max_errors: '5',
    max_error_ratio: '0.5',
  };

  // API-supported settings not managed by the wizard UI. These should still
  // be supported and included in the review output.
  const unmanagedSettings: DatasetSettings = {
    schema_sample_size: 100,
    comment: '#',
    multi_value_syntax: 'brackets',
    max_field_size: 1024,
  };

  return { settings, unmanagedSettings };
};

/** Reviews the settings the way the wizard does: from the payload, not the form values. */
const reviewItemsFor = (values: ReturnType<typeof allSettingsForFormat>) =>
  getSettingsReviewItems(mergedSettingsFromForm(values.settings, values.unmanagedSettings));

describe('getSettingsReviewItems', () => {
  it('labels every setting that reaches the request payload', () => {
    for (const format of ['csv', 'tsv', 'ndjson', 'parquet'] as const) {
      const values = allSettingsForFormat(format);
      const applied = mergedSettingsFromForm(values.settings, values.unmanagedSettings) ?? {};
      const items = reviewItemsFor(values);

      for (const key of Object.keys(applied)) {
        const item = items.find((candidate) => candidate.key === key);
        expect(item).toBeDefined();
        expect(item?.label).not.toBe(key);
        expect(item?.value).not.toBe('');
      }
    }
  });

  it('translates enum, boolean and list values', () => {
    const items = reviewItemsFor(allSettingsForFormat('csv'));
    const valueOf = (key: string) => items.find((item) => item.key === key)?.value;

    expect(valueOf('format')).toBe('CSV');
    expect(valueOf('schema_resolution')).toBe('Union by name');
    expect(valueOf('header_row')).toBe('No');
    expect(valueOf('hive_partitioning')).toBe('Enabled');
    expect(valueOf('file_exclusions')).toBe('**/skip/*');
    expect(valueOf('max_errors')).toBe('5');
  });

  it('marks configured settings as custom and leaves format unmarked', () => {
    const items = reviewItemsFor(allSettingsForFormat('csv'));
    const originOf = (key: string) => items.find((item) => item.key === key)?.origin;

    expect(originOf('format')).toBeUndefined();
    expect(originOf('schema_resolution')).toBe('custom');
    expect(originOf('error_mode')).toBe('custom');
  });

  it('falls back to the documented default when a setting is untouched', () => {
    const items = reviewItemsFor({
      settings: {
        ...emptyCreateDatasetSettingsFormValues(),
        format: 'parquet',
      },
      unmanagedSettings: {},
    });

    expect(items.find((item) => item.key === 'error_mode')).toEqual({
      key: 'error_mode',
      label: 'Error mode',
      value: 'Fail fast',
      origin: 'default',
    });
    expect(items.find((item) => item.key === 'schema_resolution')).toBeUndefined();
  });

  it('still reports the documented defaults when no settings are sent', () => {
    const items = getSettingsReviewItems(undefined);

    expect(items.find((item) => item.key === 'error_mode')?.origin).toBe('default');
    expect(items.find((item) => item.key === 'format')).toBeUndefined();
  });
});
