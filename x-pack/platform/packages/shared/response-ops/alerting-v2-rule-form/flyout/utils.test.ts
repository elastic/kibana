/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import {
  getTimeOptions,
  getTimeFieldOptions,
  firstFieldOption,
  parseDuration,
  formatDuration,
  getDurationUnitValue,
  getDurationNumberInItsUnit,
} from './utils';

describe('utils', () => {
  describe('getTimeOptions', () => {
    it('returns singular time unit labels when value is 1', () => {
      const options = getTimeOptions(1);

      expect(options).toHaveLength(4);
      expect(options.find((o) => o.value === 's')?.text).toBe('second');
      expect(options.find((o) => o.value === 'm')?.text).toBe('minute');
      expect(options.find((o) => o.value === 'h')?.text).toBe('hour');
      expect(options.find((o) => o.value === 'd')?.text).toBe('day');
    });

    it('returns plural time unit labels when value is greater than 1', () => {
      const options = getTimeOptions(5);

      expect(options).toHaveLength(4);
      expect(options.find((o) => o.value === 's')?.text).toBe('seconds');
      expect(options.find((o) => o.value === 'm')?.text).toBe('minutes');
      expect(options.find((o) => o.value === 'h')?.text).toBe('hours');
      expect(options.find((o) => o.value === 'd')?.text).toBe('days');
    });

    it('defaults to singular labels when no value provided', () => {
      const options = getTimeOptions();

      expect(options.find((o) => o.value === 'm')?.text).toBe('minute');
    });
  });

  describe('getTimeFieldOptions', () => {
    it('returns empty array when no fields provided', () => {
      const options = getTimeFieldOptions({});

      expect(options).toEqual([]);
    });

    it('returns only date fields', () => {
      const fields: DataViewFieldMap = {
        '@timestamp': {
          name: '@timestamp',
          type: 'date',
          searchable: true,
          aggregatable: true,
        },
        message: {
          name: 'message',
          type: 'string',
          searchable: true,
          aggregatable: false,
        },
        'event.created': {
          name: 'event.created',
          type: 'date',
          searchable: true,
          aggregatable: true,
        },
      } as DataViewFieldMap;

      const options = getTimeFieldOptions(fields);

      expect(options).toHaveLength(2);
      expect(options).toContainEqual({ text: '@timestamp', value: '@timestamp' });
      expect(options).toContainEqual({ text: 'event.created', value: 'event.created' });
    });

    it('includes date_nanos fields', () => {
      const fields: DataViewFieldMap = {
        'event.ingested': {
          name: 'event.ingested',
          type: 'date_nanos',
          searchable: true,
          aggregatable: true,
        },
      } as DataViewFieldMap;

      const options = getTimeFieldOptions(fields);

      expect(options).toHaveLength(1);
      expect(options[0]).toEqual({ text: 'event.ingested', value: 'event.ingested' });
    });
  });

  describe('firstFieldOption', () => {
    it('has empty value and placeholder text', () => {
      expect(firstFieldOption.value).toBe('');
      expect(firstFieldOption.text).toBe('Select a field');
    });
  });

  describe('parseDuration', () => {
    it('parses seconds correctly', () => {
      expect(parseDuration('30s')).toBe(30 * 1000);
      expect(parseDuration('1s')).toBe(1000);
    });

    it('parses minutes correctly', () => {
      expect(parseDuration('5m')).toBe(5 * 60 * 1000);
      expect(parseDuration('1m')).toBe(60 * 1000);
    });

    it('parses hours correctly', () => {
      expect(parseDuration('2h')).toBe(2 * 60 * 60 * 1000);
      expect(parseDuration('1h')).toBe(60 * 60 * 1000);
    });

    it('parses days correctly', () => {
      expect(parseDuration('3d')).toBe(3 * 24 * 60 * 60 * 1000);
      expect(parseDuration('1d')).toBe(24 * 60 * 60 * 1000);
    });

    it('throws error for invalid format', () => {
      expect(() => parseDuration('invalid')).toThrow('Invalid duration format');
      expect(() => parseDuration('5')).toThrow('Invalid duration format');
      expect(() => parseDuration('m5')).toThrow('Invalid duration format');
      expect(() => parseDuration('')).toThrow('Invalid duration format');
    });
  });

  describe('formatDuration', () => {
    describe('long format (default)', () => {
      it('formats days correctly', () => {
        expect(formatDuration(24 * 60 * 60 * 1000)).toBe('1 day');
        expect(formatDuration(3 * 24 * 60 * 60 * 1000)).toBe('3 days');
      });

      it('formats hours correctly', () => {
        expect(formatDuration(60 * 60 * 1000)).toBe('1 hour');
        expect(formatDuration(5 * 60 * 60 * 1000)).toBe('5 hours');
      });

      it('formats minutes correctly', () => {
        expect(formatDuration(60 * 1000)).toBe('1 minute');
        expect(formatDuration(15 * 60 * 1000)).toBe('15 minutes');
      });

      it('formats seconds correctly', () => {
        expect(formatDuration(1000)).toBe('1 second');
        expect(formatDuration(30 * 1000)).toBe('30 seconds');
      });
    });

    describe('short format', () => {
      it('formats days correctly', () => {
        expect(formatDuration(24 * 60 * 60 * 1000, true)).toBe('1d');
        expect(formatDuration(3 * 24 * 60 * 60 * 1000, true)).toBe('3d');
      });

      it('formats hours correctly', () => {
        expect(formatDuration(60 * 60 * 1000, true)).toBe('1h');
        expect(formatDuration(5 * 60 * 60 * 1000, true)).toBe('5h');
      });

      it('formats minutes correctly', () => {
        expect(formatDuration(60 * 1000, true)).toBe('1m');
        expect(formatDuration(15 * 60 * 1000, true)).toBe('15m');
      });

      it('formats seconds correctly', () => {
        expect(formatDuration(1000, true)).toBe('1s');
        expect(formatDuration(30 * 1000, true)).toBe('30s');
      });
    });

    it('prefers larger units when applicable', () => {
      // 2 hours should be "2 hours" not "120 minutes"
      expect(formatDuration(2 * 60 * 60 * 1000)).toBe('2 hours');
      // 1 day should be "1 day" not "24 hours"
      expect(formatDuration(24 * 60 * 60 * 1000)).toBe('1 day');
    });
  });

  describe('getDurationUnitValue', () => {
    it('extracts unit from valid duration strings', () => {
      expect(getDurationUnitValue('5s')).toBe('s');
      expect(getDurationUnitValue('10m')).toBe('m');
      expect(getDurationUnitValue('2h')).toBe('h');
      expect(getDurationUnitValue('1d')).toBe('d');
    });

    it('returns default "m" for invalid formats', () => {
      expect(getDurationUnitValue('invalid')).toBe('m');
      expect(getDurationUnitValue('')).toBe('m');
      expect(getDurationUnitValue('5')).toBe('m');
    });
  });

  describe('getDurationNumberInItsUnit', () => {
    it('extracts number from valid duration strings', () => {
      expect(getDurationNumberInItsUnit('5s')).toBe(5);
      expect(getDurationNumberInItsUnit('10m')).toBe(10);
      expect(getDurationNumberInItsUnit('24h')).toBe(24);
      expect(getDurationNumberInItsUnit('7d')).toBe(7);
    });

    it('returns default 1 for invalid formats', () => {
      expect(getDurationNumberInItsUnit('invalid')).toBe(1);
      expect(getDurationNumberInItsUnit('')).toBe(1);
      expect(getDurationNumberInItsUnit('m5')).toBe(1);
    });
  });
});
