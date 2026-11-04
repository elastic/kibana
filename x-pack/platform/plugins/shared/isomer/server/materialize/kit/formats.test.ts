/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import moment from 'moment-timezone';
import type { PortableFormat } from '@kbn/isomer';
import type { KitServices } from './create_kit';
import { createFormatMapper } from './formats';
import { createTestKitServices } from './kit_services.mock';

interface NumeralLanguage {
  id: string;
  lang: unknown;
}

// The languages Kibana's numeral formats register, so the oracle formats in the same locales.
const numeralLanguages: NumeralLanguage[] = jest.requireActual('@elastic/numeral/languages');
numeralLanguages.forEach(({ id, lang }) => numeral.language(id, lang));

/** Formats `value` the way a portable numeral format says to: its pattern, in its locale. */
const formatNumeral = (format: PortableFormat, value: number): string => {
  if (!('pattern' in format) || format.kind === 'date') {
    throw new Error(`Not a numeral format: ${format.kind}`);
  }
  numeral.language(format.locale ?? 'en');
  const formatted = numeral(value).format(format.pattern);
  numeral.language('en');
  return formatted;
};

const NUMBERS = [0, 1, -0.5, 1234.5678, 0.0123, 1_500_000_000];

let services: KitServices;
let mapFormat: ReturnType<typeof createFormatMapper>;

beforeAll(async () => {
  services = await createTestKitServices();
  mapFormat = createFormatMapper(services.registry, services.settings);
});

describe('createFormatMapper', () => {
  describe('numeral formats', () => {
    it.each([
      ['number', { id: 'number' }],
      ['number', { id: 'number', params: { pattern: '0,0.00' } }],
      ['percent', { id: 'percent' }],
      ['bytes', { id: 'bytes' }],
      ['bytes', { id: 'bytes', params: { pattern: '0.0b' } }],
    ])('maps %s %j to a pattern that formats as Kibana does', (kind, serialized) => {
      const { format, toText, prerender } = mapFormat(serialized, 'number');
      expect(prerender).toBeUndefined();
      expect(format).toEqual(expect.objectContaining({ kind }));
      for (const value of NUMBERS) {
        expect(formatNumeral(format!, value)).toBe(toText(value));
      }
    });

    it("formats with Kibana's number locale", async () => {
      const german = await createTestKitServices({ 'format:number:defaultLocale': 'de' });
      const { format, toText } = createFormatMapper(german.registry, german.settings)(
        { id: 'number', params: { pattern: '0,0.00' } },
        'number'
      );
      expect(format).toEqual({ kind: 'number', pattern: '0,0.00', locale: 'de' });
      expect(toText(1234.5)).not.toBe('1,234.50');
      expect(formatNumeral(format!, 1234.5)).toBe(toText(1234.5));
    });

    it('carries alwaysShowSign', () => {
      const { format, toText } = mapFormat(
        { id: 'number', params: { pattern: '0.0', alwaysShowSign: true } },
        'number'
      );
      expect(format).toEqual({ kind: 'number', pattern: '0.0', alwaysShowSign: true });
      expect(toText(2)).toBe('+2.0');
    });

    it('pre-renders percentages stored as whole numbers', () => {
      const { format, prerender, toText } = mapFormat(
        { id: 'percent', params: { fractional: false } },
        'number'
      );
      expect(format).toBeUndefined();
      expect(prerender).toBeDefined();
      expect(toText(35)).toBe('35%');
    });

    it('pre-renders currency, which has no portable kind', () => {
      const { format, prerender, toText } = mapFormat({ id: 'currency' }, 'number');
      expect(format).toBeUndefined();
      expect(prerender).toBeDefined();
      expect(toText(12.5)).toContain('$');
    });
  });

  describe('dates', () => {
    const DATES = [0, Date.UTC(2026, 10, 4, 6, 30, 15, 123), '2026-03-29T01:30:00.000Z'];

    it.each([
      [
        'the default pattern, with the Browser time zone formatting as UTC',
        undefined,
        undefined,
        'UTC',
      ],
      [
        'a pattern in the context time zone',
        { pattern: 'YYYY-MM-DD HH:mm' },
        'Europe/Paris',
        'Europe/Paris',
      ],
    ])('maps %s', (_name, params, contextTimeZone, timeZone) => {
      const { format, toText } = mapFormat({ id: 'date', params }, 'date', contextTimeZone);
      expect(format).toEqual({
        kind: 'date',
        pattern: params?.pattern ?? 'MMM D, YYYY @ HH:mm:ss.SSS',
        timeZone,
      });
      for (const value of DATES) {
        const { pattern } = format as Extract<PortableFormat, { kind: 'date' }>;
        expect(moment.utc(value).tz(timeZone).format(pattern)).toBe(toText(value));
      }
    });

    it('defaults a date column without a format to the date format', () => {
      expect(mapFormat(undefined, 'date').format).toEqual(
        expect.objectContaining({ kind: 'date' })
      );
    });
  });

  describe('durations', () => {
    it.each([
      [{ inputFormat: 'seconds', outputFormat: 'asMinutes', outputPrecision: 1, showSuffix: true }],
      [{ inputFormat: 'milliseconds', outputFormat: 'humanizePrecise', useShortSuffix: true }],
      [{ inputFormat: 'nanoseconds', outputFormat: 'asMilliseconds', outputPrecision: 3 }],
    ])('maps %j to a format that reads back as the same Kibana format', (params) => {
      const { format, toText } = mapFormat({ id: 'duration', params }, 'number');
      if (format?.kind !== 'duration') {
        throw new Error('expected a duration format');
      }
      // Read the portable format back as Kibana's duration params, as a renderer would apply them.
      const readBack = services.registry.getInstance('duration', {
        inputFormat: format.input,
        outputFormat:
          format.output === 'humanize' || format.output === 'humanizePrecise'
            ? format.output
            : `as${format.output[0].toUpperCase()}${format.output.slice(1)}`,
        ...(format.decimals !== undefined ? { outputPrecision: format.decimals } : {}),
        showSuffix: format.showSuffix ?? false,
        useShortSuffix: format.useShortSuffix ?? false,
        includeSpaceWithSuffix: format.includeSpaceWithSuffix ?? true,
      });
      for (const value of [0, 1, 90, 3_600_000, 86_400_123]) {
        expect(readBack.convertToText(value)).toBe(toText(value));
      }
    });
  });

  describe('text', () => {
    it('maps strings, booleans and IPs to text', () => {
      expect(mapFormat({ id: 'string' }, 'string').format).toEqual({ kind: 'text' });
      expect(mapFormat(undefined, 'boolean').format).toEqual({ kind: 'text' });
      expect(mapFormat({ id: 'ip' }, 'string').format).toEqual({ kind: 'text' });
    });

    it('pre-renders a string transform', () => {
      const { format, prerender, toText } = mapFormat(
        { id: 'string', params: { transform: 'upper' } },
        'string'
      );
      expect(format).toBeUndefined();
      expect(prerender).toBeDefined();
      expect(toText('web-01')).toBe('WEB-01');
    });

    it.each(['url', 'color', 'static_lookup', 'truncate', 'relative_date'])(
      "pre-renders %s with Kibana's formatter",
      (id) => {
        const { format, prerender } = mapFormat({ id }, 'string');
        expect(format).toBeUndefined();
        expect(prerender).toBeDefined();
      }
    );
  });

  describe('wrapper formats', () => {
    it('unwraps a terms format and keeps its Other and missing labels', () => {
      const { format, labels } = mapFormat(
        {
          id: 'terms',
          params: {
            id: 'string',
            otherBucketLabel: 'Other',
            missingBucketLabel: '(missing value)',
          },
        },
        'string'
      );
      expect(format).toEqual({ kind: 'text' });
      expect(labels).toEqual({ __other__: 'Other', __missing__: '(missing value)' });
    });

    it("adds a Lens suffix to a numeral format's own", () => {
      const { format, toText } = mapFormat(
        {
          id: 'suffix',
          params: { id: 'number', params: { pattern: '0.0' }, suffixString: ' req' },
        },
        'number'
      );
      expect(format).toEqual({ kind: 'number', pattern: '0.0', suffix: ' req' });
      expect(toText(2)).toBe('2.0 req');
    });

    it('drops a format the server does not have', () => {
      const { format, dropped, toText } = mapFormat(
        { id: 'range', params: { id: 'number' } },
        'string'
      );
      expect(format).toBeUndefined();
      expect(dropped).toBe('The "range" field format is not available on the server.');
      expect(toText('1 to 2')).toBe('1 to 2');
    });
  });
});
