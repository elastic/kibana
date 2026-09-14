/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applyInlineOptionalDateFormatToField,
  isInlineOptionalDateFormatMappingType,
  readInlineOptionalDateFormatFromField,
} from './inline_optional_date_format_parameter';

describe('inline optional date format parameter helpers', () => {
  describe('readInlineOptionalDateFormatFromField', () => {
    it('returns string formats as-is', () => {
      expect(readInlineOptionalDateFormatFromField('yyyy-MM-dd')).toBe('yyyy-MM-dd');
    });

    it('returns empty string for non-string values', () => {
      expect(readInlineOptionalDateFormatFromField(undefined)).toBe('');
    });
  });

  describe('applyInlineOptionalDateFormatToField', () => {
    it('adds format for date types when text is provided', () => {
      expect(
        applyInlineOptionalDateFormatToField({ type: 'date', name: 'event_time' }, 'date', 'yyyy-MM-dd')
      ).toEqual({
        type: 'date',
        name: 'event_time',
        format: 'yyyy-MM-dd',
      });
    });

    it('removes format when text is empty', () => {
      expect(
        applyInlineOptionalDateFormatToField(
          { type: 'date', name: 'event_time', format: 'yyyy-MM-dd' },
          'date',
          '   '
        )
      ).toEqual({
        type: 'date',
        name: 'event_time',
      });
    });

    it('ignores non-date types', () => {
      expect(
        applyInlineOptionalDateFormatToField({ type: 'keyword', name: 'host' }, 'keyword', 'yyyy-MM-dd')
      ).toEqual({
        type: 'keyword',
        name: 'host',
      });
    });
  });

  describe('isInlineOptionalDateFormatMappingType', () => {
    it('matches date types only', () => {
      expect(isInlineOptionalDateFormatMappingType('date')).toBe(true);
      expect(isInlineOptionalDateFormatMappingType('date_nanos')).toBe(true);
      expect(isInlineOptionalDateFormatMappingType('keyword')).toBe(false);
    });
  });
});
