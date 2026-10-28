/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP_FIELD_ID, TIMESTAMP_LOGICAL_FIELD_NAME } from './constants';
import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { emptyDatasetFormValues } from './dataset_form_initial_values';
import { getValidStepIds } from './step_validity';

const buildValues = ({
  settings,
  mappings,
}: {
  settings?: Partial<CreateDatasetFormValues['settings']>;
  mappings?: Partial<CreateDatasetFormValues['mappings']>;
} = {}): CreateDatasetFormValues => {
  const values = emptyDatasetFormValues();
  return {
    ...values,
    settings: { ...values.settings, format: 'csv', ...settings },
    mappings: { dynamic: true, fields: [], ...mappings },
  };
};

describe('getValidStepIds', () => {
  it('SHOULD include every skippable step WHEN all values are valid', () => {
    expect(getValidStepIds(buildValues())).toEqual(['settings', 'mapping']);
  });

  describe('WHEN an Additional settings rule fails', () => {
    it.each<[string, Partial<CreateDatasetFormValues['settings']>]>([
      ['an invalid delimiter', { delimiter: 'ab' }],
      ['an invalid quote character', { quote: 'ab' }],
      ['an invalid escape character', { escape: 'ab' }],
      ['an out of range skip rows', { skip_rows: '1001' }],
      ['a quote character equal to the escape character', { quote: "'", escape: "'" }],
      ['a template partition detection without a path', { partition_detection: 'template' }],
      [
        'an invalid max errors with a budget error mode',
        { error_mode: 'skip_row', max_errors: 'x' },
      ],
      [
        'an invalid max error ratio with a budget error mode',
        { error_mode: 'null_field', max_error_ratio: '2' },
      ],
    ])('SHOULD exclude the settings step for %s', (_label, settings) => {
      expect(getValidStepIds(buildValues({ settings }))).toEqual(['mapping']);
    });
  });

  describe('WHEN a rule fails for a field the step does not show', () => {
    it.each<[string, Partial<CreateDatasetFormValues['settings']>]>([
      ['CSV characters for a non CSV format', { format: 'parquet', delimiter: 'ab' }],
      ['max errors without a budget error mode', { error_mode: 'fail_fast', max_errors: 'x' }],
      ['a partition path without template detection', { partition_detection: 'hive' }],
    ])('SHOULD include the settings step for %s', (_label, settings) => {
      expect(getValidStepIds(buildValues({ settings }))).toEqual(['settings', 'mapping']);
    });
  });

  describe('WHEN a delimiter matches the default quote of only one format', () => {
    it('SHOULD include the settings step for TSV', () => {
      expect(getValidStepIds(buildValues({ settings: { format: 'tsv', delimiter: '"' } }))).toEqual(
        ['settings', 'mapping']
      );
    });

    it('SHOULD exclude the settings step for CSV', () => {
      expect(getValidStepIds(buildValues({ settings: { format: 'csv', delimiter: '"' } }))).toEqual(
        ['mapping']
      );
    });
  });

  describe('WHEN a Mapping rule fails', () => {
    it.each<[string, Partial<CreateDatasetFormValues['mappings']>]>([
      [
        'a timestamp field without a path',
        {
          fields: [
            {
              id: TIMESTAMP_FIELD_ID,
              name: TIMESTAMP_LOGICAL_FIELD_NAME,
              path: '',
              type: 'date',
              format: '',
            },
          ],
        },
      ],
      ['a defined schema without mapped fields', { dynamic: false }],
    ])('SHOULD exclude the mapping step for %s', (_label, mappings) => {
      expect(getValidStepIds(buildValues({ mappings }))).toEqual(['settings']);
    });
  });
});
