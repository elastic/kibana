/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getVisibleFieldsForAccordion,
  isFieldVisibleForErrorMode,
} from './dataset_settings_visibility';

describe('dataset_settings_visibility', () => {
  describe('isFieldVisibleForErrorMode', () => {
    it('hides max error fields when error mode is fail_fast', () => {
      expect(isFieldVisibleForErrorMode('max_errors', 'fail_fast')).toBe(false);
      expect(isFieldVisibleForErrorMode('max_error_ratio', 'fail_fast')).toBe(false);
    });

    it('shows max error fields for other error modes', () => {
      expect(isFieldVisibleForErrorMode('max_errors', 'skip_row')).toBe(true);
      expect(isFieldVisibleForErrorMode('max_error_ratio', 'null_field')).toBe(true);
      expect(isFieldVisibleForErrorMode('max_errors', '')).toBe(true);
    });
  });

  describe('getVisibleFieldsForAccordion', () => {
    it('excludes max error fields from error handling when fail_fast is selected', () => {
      expect(getVisibleFieldsForAccordion('errorHandling', 'csv', 'fail_fast')).toEqual([
        'error_mode',
      ]);
    });

    it('includes max error fields for skip_row', () => {
      expect(getVisibleFieldsForAccordion('errorHandling', 'csv', 'skip_row')).toEqual([
        'error_mode',
        'max_errors',
        'max_error_ratio',
      ]);
    });
  });
});
