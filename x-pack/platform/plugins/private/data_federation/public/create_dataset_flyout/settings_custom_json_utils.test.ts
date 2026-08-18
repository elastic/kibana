/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMPTY_SETTINGS_CUSTOM_JSON,
  mergeCustomJsonIntoDatasetSettings,
  parseSettingsCustomJson,
  stripJsonComments,
  validateSettingsCustomJson,
} from './settings_custom_json_utils';

describe('settings_custom_json_utils', () => {
  describe('stripJsonComments', () => {
    it('removes line comments before parsing', () => {
      expect(stripJsonComments('{\n  // "quote": "\\""\n  "escape": "\\\\"\n}')).toContain(
        '"escape": "\\\\"'
      );
    });
  });

  describe('parseSettingsCustomJson', () => {
    it('parses commented json and filters to known keys', () => {
      expect(
        parseSettingsCustomJson(`{
          // "quote": "\\"",
          "escape": "\\\\",
          "unknown_key": true
        }`)
      ).toEqual({
        escape: '\\',
      });
    });

    it('returns undefined for empty or comment-only content', () => {
      expect(parseSettingsCustomJson('{\n  // "quote": "\\""\n}')).toBeUndefined();
      expect(parseSettingsCustomJson(EMPTY_SETTINGS_CUSTOM_JSON)).toBeUndefined();
    });
  });

  describe('validateSettingsCustomJson', () => {
    it('accepts empty and comment-only content', () => {
      expect(validateSettingsCustomJson('')).toBe(true);
      expect(validateSettingsCustomJson(EMPTY_SETTINGS_CUSTOM_JSON)).toBe(true);
      expect(validateSettingsCustomJson('{\n  // "quote": "\\""\n}')).toBe(true);
    });

    it('rejects invalid json syntax', () => {
      expect(validateSettingsCustomJson('{ invalid')).toBe('Invalid JSON format.');
    });
  });

  describe('mergeCustomJsonIntoDatasetSettings', () => {
    it('merges json overrides on top of form-built settings', () => {
      const merged = mergeCustomJsonIntoDatasetSettings(
        {
          format: 'csv',
          delimiter: ',',
          quote: '"',
        },
        '{ "quote": "|", "escape": "\\\\" }'
      );

      expect(merged).toMatchObject({
        format: 'csv',
        delimiter: ',',
        quote: '|',
      });
      expect(merged?.escape).toBe('\\');
    });
  });
});
