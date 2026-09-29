/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import { emptyDatasetFormValues } from './dataset_form_initial_values';
import {
  buildDatasetSettingsFromFormValues,
  emptyCreateDatasetSettingsFormValues,
  validateDelimiter,
  validateEscapeCharacter,
  validateQuoteCharacter,
  validateMaxErrors,
  validatePartitionPath,
  validateSkipRows,
} from './create_dataset_form_state';

const empty = () => emptyCreateDatasetSettingsFormValues();

describe('create_dataset_form_state', () => {
  describe('validatePartitionPath', () => {
    const formWith = (partitionDetection: '' | 'hive' | 'template', partitionPath = '') => {
      const values = emptyDatasetFormValues();
      values.settings.partition_detection = partitionDetection;
      values.settings.partition_path = partitionPath;
      return values;
    };

    it('requires a non-empty path when partition detection is template', () => {
      expect(validatePartitionPath('', formWith('template'))).toBe(
        createDatasetWizardStrings.settingsPartitionPathRequired
      );
      expect(validatePartitionPath('   ', formWith('template'))).toBe(
        createDatasetWizardStrings.settingsPartitionPathRequired
      );
      expect(validatePartitionPath('/year={year}/', formWith('template', '/year={year}/'))).toBe(
        true
      );
    });

    it('allows an empty path when partition detection is not template', () => {
      expect(validatePartitionPath('', formWith(''))).toBe(true);
      expect(validatePartitionPath('', formWith('hive'))).toBe(true);
    });
  });

  describe('validateSkipRows', () => {
    it('accepts an empty value and whole numbers from 0 through 1000', () => {
      expect(validateSkipRows('')).toBe(true);
      expect(validateSkipRows('0')).toBe(true);
      expect(validateSkipRows('1000')).toBe(true);
    });

    it('rejects values outside that range', () => {
      expect(validateSkipRows('-1')).toBe(createDatasetWizardStrings.settingsSkipRowsInvalid);
      expect(validateSkipRows('1.5')).toBe(createDatasetWizardStrings.settingsSkipRowsInvalid);
      expect(validateSkipRows('1001')).toBe(createDatasetWizardStrings.settingsSkipRowsInvalid);
    });
  });

  describe('validateMaxErrors', () => {
    it('accepts an empty value and whole numbers from 0', () => {
      expect(validateMaxErrors('')).toBe(true);
      expect(validateMaxErrors('0')).toBe(true);
      expect(validateMaxErrors('1')).toBe(true);
      expect(validateMaxErrors('10')).toBe(true);
    });

    it('rejects values that are not whole numbers of 0 or more', () => {
      expect(validateMaxErrors('-1')).toBe(createDatasetWizardStrings.settingsMaxErrorsInvalid);
      expect(validateMaxErrors('1.5')).toBe(createDatasetWizardStrings.settingsMaxErrorsInvalid);
      expect(validateMaxErrors('abc')).toBe(createDatasetWizardStrings.settingsMaxErrorsInvalid);
    });
  });

  describe('validateDelimiter', () => {
    it('accepts empty and a single character', () => {
      expect(validateDelimiter('')).toBe(true);
      expect(validateDelimiter(',')).toBe(true);
      expect(validateDelimiter(' ')).toBe(true);
      expect(validateDelimiter('\t')).toBe(true);
    });

    it.each(['\\t', '\\\\'])('accepts the %s escape sequence', (value) => {
      expect(validateDelimiter(value)).toBe(true);
    });

    it.each(['ab', '\\a', '\\0', '\\n', '\\r', '::', '\\tt'])('rejects %s', (value) => {
      expect(validateDelimiter(value)).toBe(createDatasetWizardStrings.settingsDelimiterInvalid);
    });
  });

  describe('validateEscapeCharacter', () => {
    it('accepts empty and a single character', () => {
      expect(validateEscapeCharacter('')).toBe(true);
      expect(validateEscapeCharacter('\\')).toBe(true);
      expect(validateEscapeCharacter('/')).toBe(true);
    });

    it('accepts \\t and \\\\ escape sequences', () => {
      expect(validateEscapeCharacter('\\t')).toBe(true);
      expect(validateEscapeCharacter('\\\\')).toBe(true);
      expect(validateEscapeCharacter('\\n')).toBe(createDatasetWizardStrings.settingsEscapeInvalid);
      expect(validateEscapeCharacter('\\r')).toBe(createDatasetWizardStrings.settingsEscapeInvalid);
    });

    it('rejects two characters when the first is not a backslash', () => {
      expect(validateEscapeCharacter('ab')).toBe(createDatasetWizardStrings.settingsEscapeInvalid);
      expect(validateEscapeCharacter('""')).toBe(createDatasetWizardStrings.settingsEscapeInvalid);
    });

    it('rejects unsupported backslash escape sequences', () => {
      expect(validateEscapeCharacter('\\a')).toBe(createDatasetWizardStrings.settingsEscapeInvalid);
      expect(validateEscapeCharacter('\\0')).toBe(createDatasetWizardStrings.settingsEscapeInvalid);
      expect(validateEscapeCharacter('\\u')).toBe(createDatasetWizardStrings.settingsEscapeInvalid);
    });

    it('rejects values longer than two characters', () => {
      expect(validateEscapeCharacter('abc')).toBe(createDatasetWizardStrings.settingsEscapeInvalid);
      expect(validateEscapeCharacter('\\abc')).toBe(
        createDatasetWizardStrings.settingsEscapeInvalid
      );
    });
  });

  describe('validateQuoteCharacter', () => {
    it('accepts empty and a single character', () => {
      expect(validateQuoteCharacter('')).toBe(true);
      expect(validateQuoteCharacter('"')).toBe(true);
      expect(validateQuoteCharacter("'")).toBe(true);
    });

    it.each(['none', 'NONE', 'None'])('accepts %s to turn off quoting', (value) => {
      expect(validateQuoteCharacter(value)).toBe(true);
    });

    it.each(['\\t', '\\n', '\\r', '\\\\'])('accepts the escape sequence %s', (value) => {
      expect(validateQuoteCharacter(value)).toBe(true);
    });

    it('rejects multi-character values', () => {
      expect(validateQuoteCharacter('non')).toBe(createDatasetWizardStrings.settingsQuoteInvalid);
      expect(validateQuoteCharacter(' none')).toBe(createDatasetWizardStrings.settingsQuoteInvalid);
      expect(validateQuoteCharacter('\\b')).toBe(createDatasetWizardStrings.settingsQuoteInvalid);
      expect(validateQuoteCharacter('\\T')).toBe(createDatasetWizardStrings.settingsQuoteInvalid);
      expect(validateQuoteCharacter('ab')).toBe(createDatasetWizardStrings.settingsQuoteInvalid);
      expect(validateQuoteCharacter('\\a')).toBe(createDatasetWizardStrings.settingsQuoteInvalid);
      expect(validateQuoteCharacter('\\abc')).toBe(createDatasetWizardStrings.settingsQuoteInvalid);
    });
  });

  describe('emptyCreateDatasetSettingsFormValues', () => {
    it('returns empty-string defaults for all fields', () => {
      expect(empty()).toEqual({
        format: '',
        file_exclusions: [],
        partition_detection: '',
        schema_resolution: '',
        partition_path: '',
        delimiter: '',
        mode: '',
        header_row: '',
        skip_rows: '',
        datetime_format: '',
        null_value: '',
        encoding: '',
        error_mode: '',
        max_errors: '',
        max_error_ratio: '',
        quote: '',
        escape: '',
        column_prefix: '',
        trim_spaces: '',
      });
    });
  });

  describe('buildDatasetSettingsFromFormValues', () => {
    it('returns undefined when all fields are unset', () => {
      expect(buildDatasetSettingsFromFormValues(empty())).toBeUndefined();
    });

    it('omits empty-string fields and returns only set fields', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), partition_detection: 'hive' })
      ).toEqual({ partition_detection: 'hive' });
    });

    it('maps schema_resolution under any format', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), schema_resolution: 'union_by_name' })
      ).toEqual({ schema_resolution: 'union_by_name' });
    });

    it('maps partition_path only when partition detection is template', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          partition_detection: 'template',
          partition_path: '/year={year}/',
        })
      ).toEqual({ partition_detection: 'template', partition_path: '/year={year}/' });
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          partition_detection: 'hive',
          partition_path: '/year={year}/',
        })
      ).toEqual({ partition_detection: 'hive' });
    });

    it('omits file_exclusions when empty and includes custom values', () => {
      expect(buildDatasetSettingsFromFormValues(empty())).toBeUndefined();
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          file_exclusions: ['**/tmp/**'],
        })
      ).toEqual({ file_exclusions: ['**/tmp/**'] });
    });

    it('ignores format-specific fields when no format is selected', () => {
      expect(buildDatasetSettingsFromFormValues({ ...empty(), error_mode: 'skip_row' })).toEqual({
        error_mode: 'skip_row',
      });
      expect(buildDatasetSettingsFromFormValues({ ...empty(), delimiter: ',' })).toBeUndefined();
    });

    it('includes datetime_format for ndjson', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'ndjson',
          datetime_format: 'yyyy-MM-dd',
        })
      ).toEqual({ format: 'ndjson', datetime_format: 'yyyy-MM-dd' });
    });

    it('converts header_row boolean form values correctly', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', header_row: 'true' })
      ).toEqual({ format: 'csv', header_row: true });
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', header_row: 'false' })
      ).toEqual({ format: 'csv', header_row: false });
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', header_row: '' })
      ).toEqual({ format: 'csv' });
    });

    it('includes max_errors of 0', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', max_errors: '0' })
      ).toEqual({ format: 'csv', max_errors: 0 });
    });

    it('omits max_errors when it is not a whole number of 0 or more', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', max_errors: '-1' })
      ).toEqual({ format: 'csv' });
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', max_errors: '1.5' })
      ).toEqual({ format: 'csv' });
    });

    it('includes max_error_ratio as a float', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', max_error_ratio: '0.5' })
      ).toEqual({ format: 'csv', max_error_ratio: 0.5 });
    });

    it('includes skip_rows for csv when in range', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', skip_rows: '0' })
      ).toEqual({ format: 'csv', skip_rows: 0 });
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', skip_rows: '1000' })
      ).toEqual({ format: 'csv', skip_rows: 1000 });
    });

    it('omits skip_rows when out of range', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', skip_rows: '1001' })
      ).toEqual({ format: 'csv' });
    });

    it('omits default UTF-8 encoding and includes other encodings', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', encoding: 'UTF-8' })
      ).toEqual({ format: 'csv' });
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', encoding: 'UTF-16' })
      ).toEqual({ format: 'csv', encoding: 'UTF-16' });
    });

    it('includes a selected default datetime_format', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'csv',
          datetime_format: 'strict_date_optional_time',
        })
      ).toEqual({ format: 'csv', datetime_format: 'strict_date_optional_time' });
    });

    it('omits default CSV quote and escape characters', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'csv',
          quote: '"',
          escape: '\\',
        })
      ).toEqual({ format: 'csv' });
    });

    it('includes non-default CSV quote and escape characters', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'csv',
          quote: "'",
          escape: '"',
        })
      ).toEqual({ format: 'csv', quote: "'", escape: '"' });
    });

    it('includes a quote of none to turn off quoting', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', quote: 'none' })
      ).toEqual({ format: 'csv', quote: 'none' });
    });

    it('does not decode the \\t escape sequence in the payload (API receives the literal sequence)', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'tsv',
          escape: '\\t',
        })
      ).toEqual({ format: 'tsv', escape: '\\t' });
    });

    it('decodes a double backslash into a single backslash in the payload', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'tsv',
          escape: '\\\\',
        })
      ).toEqual({ format: 'tsv', escape: '\\' });
    });

    it('omits a double backslash for CSV because it decodes to the default escape character', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'csv',
          escape: '\\\\',
        })
      ).toEqual({ format: 'csv' });
    });

    it('includes trim_spaces when explicitly set and omits it when unset', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'csv',
          trim_spaces: 'true',
        })
      ).toEqual({ format: 'csv', trim_spaces: true });
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'csv',
          trim_spaces: 'false',
        })
      ).toEqual({ format: 'csv', trim_spaces: false });
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'csv',
          trim_spaces: '',
        })
      ).toEqual({ format: 'csv' });
    });

    it('includes format and CSV fields together', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'csv',
          delimiter: ',',
          header_row: 'true',
        })
      ).toEqual({ format: 'csv', delimiter: ',', header_row: true });
    });

    it('excludes CSV-only fields when format is parquet', () => {
      const result = buildDatasetSettingsFromFormValues({
        ...empty(),
        format: 'parquet',
        delimiter: ',',
        mode: 'quoted',
        header_row: 'true',
        encoding: 'UTF-8',
        error_mode: 'skip_row',
        max_errors: '5',
      });
      expect(result).toEqual({ format: 'parquet', error_mode: 'skip_row', max_errors: 5 });
    });

    it('excludes CSV-only fields when format is ndjson', () => {
      const result = buildDatasetSettingsFromFormValues({
        ...empty(),
        format: 'ndjson',
        delimiter: ',',
        mode: 'quoted',
      });
      expect(result).toEqual({ format: 'ndjson' });
    });
  });
});
