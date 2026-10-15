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
} from '../create_dataset_form_state';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { getSettingsReviewItems } from './review_settings_items';
import type { DatasetSettings } from '../../../common';

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
    trim_spaces: 'true',
    error_mode: 'skip_row',
    max_errors: '5',
    max_error_ratio: '0.5',
  };

  // API-supported settings the form doesn't manage: kept in the request on edit,
  // but intentionally left out of the review.
  const unmanagedSettings: DatasetSettings = {
    schema_sample_size: 100,
    comment: '#',
    multi_value_syntax: 'brackets',
    max_field_size: 1024,
  };

  return { settings, unmanagedSettings };
};

const allReviewItems = (settings: DatasetSettings | undefined) =>
  Object.values(getSettingsReviewItems(settings)).flat();

/** Reviews the settings the way the wizard does: from the payload, not the form values. */
const reviewItemsFor = (values: ReturnType<typeof allSettingsForFormat>) =>
  allReviewItems(mergedSettingsFromForm(values.settings, values.unmanagedSettings));

describe('getSettingsReviewItems', () => {
  it('labels every setting the form sends and leaves the rest out', () => {
    for (const format of ['csv', 'tsv', 'ndjson', 'parquet'] as const) {
      const values = allSettingsForFormat(format);
      const formSettings = buildDatasetSettingsFromFormValues(values.settings) ?? {};
      const items = reviewItemsFor(values);

      for (const key of Object.keys(formSettings)) {
        const item = items.find((candidate) => candidate.key === key);
        expect(item).toBeDefined();
        expect(item?.label).not.toBe(key);
        expect(item?.value).not.toBe('');
      }
      for (const key of Object.keys(values.unmanagedSettings)) {
        expect(items.find((candidate) => candidate.key === key)).toBeUndefined();
      }
    }
  });

  it('translates enum, boolean and list values', () => {
    const items = reviewItemsFor(allSettingsForFormat('csv'));
    const valueOf = (key: string) => items.find((item) => item.key === key)?.value;

    expect(valueOf('format')).toBe('CSV');
    expect(valueOf('schema_resolution')).toBe('Union by name');
    expect(valueOf('header_row')).toBe('False');
    expect(valueOf('trim_spaces')).toBe('True');
    expect(valueOf('delimiter')).toBe('Semicolon (;)');
    expect(valueOf('file_exclusions')).toBe('**/skip/*');
    expect(valueOf('max_errors')).toBe('5');
  });

  it.each([
    ['auto', createDatasetWizardStrings.settingsPartitionDetectionAuto],
    ['hive', createDatasetWizardStrings.settingsPartitionDetectionHive],
    ['template', createDatasetWizardStrings.settingsPartitionDetectionTemplate],
    ['none', createDatasetWizardStrings.settingsPartitionDetectionNone],
  ] as const)('translates the %s partition detection value', (partitionDetection, label) => {
    const { settings, unmanagedSettings } = allSettingsForFormat('csv');
    const items = allReviewItems(
      mergedSettingsFromForm(
        { ...settings, partition_detection: partitionDetection },
        unmanagedSettings
      )
    );

    expect(items.find((item) => item.key === 'partition_detection')?.value).toBe(label);
  });

  it('marks configured settings as custom and leaves format unmarked', () => {
    const items = reviewItemsFor(allSettingsForFormat('csv'));
    const originOf = (key: string) => items.find((item) => item.key === key)?.origin;

    expect(originOf('format')).toBeUndefined();
    expect(originOf('schema_resolution')).toBe('custom');
    expect(originOf('error_mode')).toBe('custom');
  });

  it('renders non-printable escape characters using escape sequences', () => {
    const { settings, unmanagedSettings } = allSettingsForFormat('tsv');
    const items = allReviewItems(
      mergedSettingsFromForm({ ...settings, escape: '\\t' }, unmanagedSettings)
    );
    expect(items.find((item) => item.key === 'escape')?.value).toBe('\\t');
  });

  it.each(['\\', '\\\\'])(
    'renders a backslash escape entered as %s as a single backslash',
    (escape) => {
      const { settings, unmanagedSettings } = allSettingsForFormat('tsv');
      const items = allReviewItems(
        mergedSettingsFromForm({ ...settings, escape }, unmanagedSettings)
      );
      expect(items.find((item) => item.key === 'escape')?.value).toBe('\\');
    }
  );

  it('groups the settings by the step that sets them', () => {
    const { settings, unmanagedSettings } = allSettingsForFormat('csv');
    const { dataset, mapping } = getSettingsReviewItems(
      mergedSettingsFromForm(settings, unmanagedSettings)
    );

    expect(dataset.map(({ key }) => key)).toEqual(['format']);
    expect(mapping).toEqual([
      {
        key: 'schema_resolution',
        label: 'Schema resolution',
        value: 'Union by name',
        origin: 'custom',
      },
    ]);
  });

  it('marks a picked schema resolution as custom, even the one applied by default', () => {
    const { mapping } = getSettingsReviewItems({
      format: 'parquet',
      schema_resolution: 'first_file_wins',
    });

    expect(mapping[0]?.origin).toBe('custom');
  });

  it('lists the additional settings in the order the form asks for them', () => {
    const { settings, unmanagedSettings } = allSettingsForFormat('csv');
    const keys = getSettingsReviewItems(
      mergedSettingsFromForm(settings, unmanagedSettings)
    ).additional.map(({ key }) => key);

    expect(keys).toEqual([
      'delimiter',
      'mode',
      'header_row',
      'skip_rows',
      'datetime_format',
      'null_value',
      'encoding',
      'quote',
      'escape',
      'column_prefix',
      'trim_spaces',
      'file_exclusions',
      'partition_detection',
      'error_mode',
      'max_errors',
      'max_error_ratio',
    ]);
  });

  it('omits the settings the user left unset', () => {
    const items = reviewItemsFor({
      settings: { ...emptyCreateDatasetSettingsFormValues(), format: 'csv' },
      unmanagedSettings: {},
    });

    expect(items).toEqual([{ key: 'format', label: 'Format', value: 'CSV' }]);
    expect(allReviewItems(undefined)).toEqual([]);
  });

  it.each([
    ['a tab picked from the presets', '\t', 'Tab (\\t)'],
    ['a tab typed as an escape sequence', '\\t', 'Tab (\\t)'],
    ['a backslash typed as an escape sequence', '\\\\', '\\'],
    ['a space', ' ', '" "'],
    ['a custom character', '#', '#'],
  ])('shows the delimiter itself for %s', (_, delimiter, expected) => {
    const items = allReviewItems({ format: 'tsv', delimiter });

    expect(items.find((item) => item.key === 'delimiter')?.value).toBe(expected);
  });

  it.each([
    ['null_value', ' '],
    ['null_value', 'NA '],
    ['column_prefix', ' col'],
    ['partition_path', 'year=*/ '],
    ['quote', ' '],
  ] as const)('keeps surrounding spaces visible in %s %j', (key, value) => {
    const items = allReviewItems({ format: 'csv', [key]: value });

    expect(items.find((item) => item.key === key)?.value).toBe(`"${value}"`);
  });

  it.each([
    ['quote', '\t'],
    ['null_value', '\t'],
  ] as const)('shows a tab in %s as \\t', (key, value) => {
    const items = allReviewItems({ format: 'csv', [key]: value });

    expect(items.find((item) => item.key === key)?.value).toBe('\\t');
  });

  it('keeps invisible characters visible in list items', () => {
    const items = allReviewItems({
      format: 'csv',
      file_exclusions: ['**/tmp ', '**/\t*', '**/_*'],
    });

    expect(items.find((item) => item.key === 'file_exclusions')?.value).toBe(
      '"**/tmp ", **/\\t*, **/_*'
    );
  });

  it('shows an unchecked trim whitespace as False, like the form', () => {
    const items = allReviewItems({ format: 'csv', trim_spaces: false });

    expect(items.find((item) => item.key === 'trim_spaces')?.value).toBe('False');
  });

  it('leaves settings the form does not manage out of the review', () => {
    const items = allReviewItems({
      format: 'parquet',
      comment: '#',
      ...({ target_split_size: '64mb', file_sort_by: 'name' } as DatasetSettings),
    });

    expect(items.map(({ key }) => key)).toEqual(['format']);
  });
});
