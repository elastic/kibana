/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDatasetSettingsFromFormValues,
  emptyCreateDatasetSettingsFormValues,
} from './create_dataset_flyout_form_state';

describe('create_dataset_flyout_form_state', () => {
  describe('emptyCreateDatasetSettingsFormValues', () => {
    it('returns empty-string defaults', () => {
      expect(emptyCreateDatasetSettingsFormValues()).toEqual({
        error_mode: '',
        partition_detection: '',
      });
    });
  });

  describe('buildDatasetSettingsFromFormValues', () => {
    it('returns undefined when all fields are unset', () => {
      expect(
        buildDatasetSettingsFromFormValues(emptyCreateDatasetSettingsFormValues())
      ).toBeUndefined();
    });

    it('omits empty-string fields and returns only set fields', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          error_mode: 'skip_row',
          partition_detection: '',
        })
      ).toEqual({ error_mode: 'skip_row' });

      expect(
        buildDatasetSettingsFromFormValues({
          error_mode: '',
          partition_detection: 'hive',
        })
      ).toEqual({ partition_detection: 'hive' });
    });

    it('includes both fields when set', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          error_mode: 'fail_fast',
          partition_detection: 'template',
        })
      ).toEqual({
        error_mode: 'fail_fast',
        partition_detection: 'template',
      });
    });
  });
});
