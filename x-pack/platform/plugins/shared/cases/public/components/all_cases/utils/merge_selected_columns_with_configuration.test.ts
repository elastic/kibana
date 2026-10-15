/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesColumnsConfiguration } from '../use_cases_columns_configuration';
import {
  getColumnBaseKey,
  mergeSelectedColumnsWithConfiguration,
} from './merge_selected_columns_with_configuration';

const configEntry = (field: string, overrides = {}) => ({
  field,
  name: field,
  canDisplay: true,
  isCheckedDefault: false,
  ...overrides,
});

describe('mergeSelectedColumnsWithConfiguration', () => {
  it('keeps the stored checked state for columns present in the configuration', () => {
    const casesColumnsConfig: CasesColumnsConfiguration = {
      title: configEntry('title', { isCheckedDefault: true }),
      status: configEntry('status', { isCheckedDefault: true }),
    };

    const result = mergeSelectedColumnsWithConfiguration({
      selectedColumns: [{ field: 'title', name: 'title', isChecked: false }],
      casesColumnsConfig,
    });

    expect(result).toEqual([
      { field: 'title', name: 'title', isChecked: false },
      { field: 'status', name: 'status', isChecked: true },
    ]);
  });

  it('carries a legacy custom-field selection onto the extended-field column after a flag flip', () => {
    // pre-flip storage keyed by the bare legacy key; post-flip config keyed `<key>_as_<type>`.
    const casesColumnsConfig: CasesColumnsConfiguration = {
      title: configEntry('title', { isCheckedDefault: true }),
      abc_as_boolean: configEntry('abc_as_boolean'),
    };

    const result = mergeSelectedColumnsWithConfiguration({
      selectedColumns: [{ field: 'abc', name: 'abc', isChecked: true }],
      casesColumnsConfig,
    });

    expect(result).toContainEqual({
      field: 'abc_as_boolean',
      name: 'abc_as_boolean',
      isChecked: true,
    });
    // no orphan/duplicate for the stored legacy key
    expect(result.filter(({ field }) => getColumnBaseKey(field) === 'abc')).toHaveLength(1);
  });

  it('carries an extended-field selection back onto the legacy column after a flag revert', () => {
    const casesColumnsConfig: CasesColumnsConfiguration = {
      title: configEntry('title', { isCheckedDefault: true }),
      abc: configEntry('abc'),
    };

    const result = mergeSelectedColumnsWithConfiguration({
      selectedColumns: [{ field: 'abc_as_boolean', name: 'abc_as_boolean', isChecked: true }],
      casesColumnsConfig,
    });

    expect(result).toContainEqual({ field: 'abc', name: 'abc', isChecked: true });
  });

  it('does not strip suffixes that are not known v2 field types (bare keys untouched)', () => {
    expect(getColumnBaseKey('abc')).toBe('abc');
    expect(getColumnBaseKey('abc_as_boolean')).toBe('abc');
    expect(getColumnBaseKey('foo_as_bar')).toBe('foo_as_bar');
  });
});
