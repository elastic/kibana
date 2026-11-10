/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricNode, PortableFormat } from '@kbn/isomer';
import { resolveChart } from '@kbn/isomer';
import type { KitServices } from './create_kit';
import {
  createFormatMapper,
  intlLocaleFor,
  parseMomentPattern,
  parseNumeralPattern,
} from './formats';
import { createTestKitServices } from './kit_services.mock';

/**
 * What Isomer prints for `value` in `format`: the text of a one-value metric, resolved as a
 * renderer would. Isomer exports no formatter, so its resolver is the oracle.
 */
const isomerText = (
  format: PortableFormat,
  value: number | string,
  { type = 'number', locale }: { type?: 'number' | 'date'; locale?: string } = {}
): string => {
  const node: MetricNode = {
    type: 'metric',
    data: { columns: [{ id: 'v', label: 'v', type, role: 'metric', format }], rows: [[value]] },
    value: { column: 'v' },
  };
  const scene = resolveChart(node, { scheme: 'light', locale });
  if (scene.kind !== 'metric') {
    throw new Error(`Expected a metric Scene, got ${scene.kind}`);
  }
  return scene.tiles[0].value.text;
};

const NUMBERS = [0, 1, -0.5, 1234.5678, 0.0123, 1_500_000_000];

let services: KitServices;
let mapFormat: ReturnType<typeof createFormatMapper>;

beforeAll(async () => {
  services = await createTestKitServices();
  mapFormat = createFormatMapper(services.registry, services.settings);
});

describe('parseNumeralPattern', () => {
  it.each([
    ['0,0.[000]', { minimumFractionDigits: 0, maximumFractionDigits: 3 }],
    ['0,0.00', { minimumFractionDigits: 2, maximumFractionDigits: 2 }],
    ['0.0', { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false }],
    ['0,0[.]00', { minimumFractionDigits: 0, maximumFractionDigits: 2 }],
    ['+0,0', { minimumFractionDigits: 0, maximumFractionDigits: 0, signDisplay: 'exceptZero' }],
  ])('reads %s', (pattern, options) => {
    expect(parseNumeralPattern(pattern)).toEqual({ options, compact: false });
  });

  it('reads units and compact notation', () => {
    expect(parseNumeralPattern('0,0.[000]%')?.unit).toEqual({ kind: 'percent' });
    expect(parseNumeralPattern('0,0.[0]b')?.unit).toEqual({ kind: 'bytes', base: 1024 });
    expect(parseNumeralPattern('0.0 bd')?.unit).toEqual({ kind: 'bytes', base: 1000 });
    expect(parseNumeralPattern('0.0bitd')?.unit).toEqual({ kind: 'bits', base: 1000 });
    expect(parseNumeralPattern('0.0a')?.compact).toBe(true);
  });

  it.each(['($0,0.00)', '0o', '00:00:00', '0.0e+0', '0,0 req'])(
    'has no portable reading of %s',
    (pattern) => {
      expect(parseNumeralPattern(pattern)).toBeUndefined();
    }
  );
});

describe('parseMomentPattern', () => {
  it("reads Kibana's default date format as the same fields", () => {
    expect(parseMomentPattern('MMM D, YYYY @ HH:mm:ss.SSS')).toEqual({
      options: {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        hour12: false,
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      },
      dropped: [],
    });
  });

  it('reads localized styles, and keeps fields over styles', () => {
    expect(parseMomentPattern('LLL').options).toEqual({ dateStyle: 'long', timeStyle: 'short' });
    expect(parseMomentPattern('L HH:mm').options).toEqual({
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
    });
  });

  it('drops tokens with no Intl field, and literals', () => {
    expect(parseMomentPattern('[Week] w, YYYY')).toEqual({
      options: { year: 'numeric' },
      dropped: ['w'],
    });
  });
});

describe('intlLocaleFor', () => {
  it.each([
    ['en', 'en'],
    ['de', 'de'],
    ['zh-cn', 'zh-CN'],
    ['chs', 'zh-Hans'],
    [undefined, 'en'],
    ['not a locale!', 'en'],
  ])('maps %s to %s', (numeral, intl) => {
    expect(intlLocaleFor(numeral)).toBe(intl);
  });
});

describe('createFormatMapper', () => {
  describe('numeral formats', () => {
    it.each([
      ['number', { id: 'number' }],
      ['number', { id: 'number', params: { pattern: '0,0.00' } }],
      ['percent', { id: 'percent' }],
      ['percent', { id: 'percent', params: { pattern: '0.0%' } }],
    ])('maps %s %j to a format Isomer prints as Kibana does', (kind, serialized) => {
      const { format, toText, prerender } = mapFormat(serialized, 'number');
      expect(prerender).toBeUndefined();
      expect(format).toEqual(expect.objectContaining({ kind }));
      for (const value of NUMBERS) {
        expect(isomerText(format!, value)).toBe(toText(value));
      }
    });

    it('maps bytes to the nearest Intl units, base 1024', () => {
      const { format, toText } = mapFormat({ id: 'bytes' }, 'number');
      expect(format).toEqual({
        kind: 'bytes',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
        base: 1024,
        unitDisplay: 'narrow',
      });
      // Numeral.js writes `KB`; `Intl` writes `kB`. The number and unit are the same.
      for (const value of [0, 1023, 1536, 1_500_000, 5e9]) {
        expect(isomerText(format!, value).toUpperCase()).toBe(toText(value).toUpperCase());
      }
    });

    it('maps compact notation', () => {
      const { format, toText } = mapFormat({ id: 'number', params: { pattern: '0.0a' } }, 'number');
      expect(format).toEqual(expect.objectContaining({ kind: 'number', notation: 'compact' }));
      expect(isomerText(format!, 1_500_000).toLowerCase()).toBe(toText(1_500_000));
    });

    it("leaves the number locale to the chart's locale", async () => {
      const german = await createTestKitServices({ 'format:number:defaultLocale': 'de' });
      const { format, toText } = createFormatMapper(german.registry, german.settings)(
        { id: 'number', params: { pattern: '0,0.00' } },
        'number'
      );
      expect(format).toEqual({
        kind: 'number',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      // Numeral.js's German groups thousands with a space; `Intl`'s with a period.
      expect(toText(1234.5)).toBe('1 234,50');
      expect(isomerText(format!, 1234.5, { locale: intlLocaleFor('de') })).toBe('1.234,50');
    });

    it('carries alwaysShowSign', () => {
      const { format, toText } = mapFormat(
        { id: 'number', params: { pattern: '0.0', alwaysShowSign: true } },
        'number'
      );
      expect(format).toEqual(expect.objectContaining({ signDisplay: 'exceptZero' }));
      for (const value of [0, 2, -2]) {
        expect(isomerText(format!, value)).toBe(toText(value));
      }
    });

    it('maps percentages stored as whole numbers', () => {
      const { format, prerender, toText } = mapFormat(
        { id: 'percent', params: { fractional: false } },
        'number'
      );
      expect(prerender).toBeUndefined();
      expect(format).toEqual(expect.objectContaining({ kind: 'percent', fractional: false }));
      expect(isomerText(format!, 35)).toBe(toText(35));
    });

    it('pre-renders a numeral pattern with no portable form', () => {
      const { format, prerender, toText } = mapFormat(
        { id: 'number', params: { pattern: '0o' } },
        'number'
      );
      expect(format).toBeUndefined();
      expect(prerender).toBe('The "0o" number pattern has no portable form.');
      expect(toText(2)).toBe('2nd');
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

    it('maps the default pattern to the same fields, with the Browser time zone as UTC', () => {
      const { format, toText, approximated } = mapFormat({ id: 'date' }, 'date');
      expect(format).toEqual(expect.objectContaining({ kind: 'date', timeZone: 'UTC' }));
      expect(approximated).toBeUndefined();
      for (const value of DATES) {
        // Kibana writes `@` between the date and time, where `Intl` writes a comma.
        expect(isomerText(format!, value, { type: 'date' })).toBe(toText(value).replace(' @', ','));
      }
    });

    it('formats in the context time zone', () => {
      const { format, toText } = mapFormat(
        { id: 'date', params: { pattern: 'HH:mm' } },
        'date',
        'Europe/Paris'
      );
      expect(format).toEqual({
        kind: 'date',
        hour: '2-digit',
        hour12: false,
        minute: '2-digit',
        timeZone: 'Europe/Paris',
      });
      expect(isomerText(format!, DATES[1], { type: 'date' })).toBe(toText(DATES[1]));
    });

    it('records the parts of a pattern it drops', () => {
      const { approximated } = mapFormat({ id: 'date', params: { pattern: '[Q]Q YYYY' } }, 'date');
      expect(approximated).toBe("The date pattern's Q part has no portable form.");
    });

    it('defaults a date column without a format to the date format', () => {
      expect(mapFormat(undefined, 'date').format).toEqual(
        expect.objectContaining({ kind: 'date' })
      );
    });
  });

  describe('durations', () => {
    it('maps a converted duration with its suffix', () => {
      const { format, toText } = mapFormat(
        {
          id: 'duration',
          params: {
            inputFormat: 'seconds',
            outputFormat: 'asMinutes',
            outputPrecision: 1,
            showSuffix: true,
          },
        },
        'number'
      );
      expect(format).toEqual({
        kind: 'duration',
        input: 'seconds',
        output: 'minutes',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        unitDisplay: 'long',
      });
      for (const value of [0, 90, 3600]) {
        expect(isomerText(format!, value)).toBe(toText(value));
      }
    });

    it('maps a precise humanized duration to the largest unit, short', () => {
      const { format, toText } = mapFormat(
        {
          id: 'duration',
          params: {
            inputFormat: 'milliseconds',
            outputFormat: 'humanizePrecise',
            useShortSuffix: true,
          },
        },
        'number'
      );
      expect(format).toEqual(expect.objectContaining({ output: 'auto', unitDisplay: 'narrow' }));
      // Kibana puts a space before a short unit; `Intl`'s narrow units have none.
      for (const value of [1, 90, 3_600_000]) {
        expect(isomerText(format!, value)).toBe(toText(value).replace(' ', ''));
      }
    });

    it("maps a humanized duration to whole units, as moment's words are nearest", () => {
      const { format } = mapFormat(
        { id: 'duration', params: { inputFormat: 'milliseconds', outputFormat: 'humanize' } },
        'number'
      );
      expect(isomerText(format!, 90_000)).toBe('2 minutes');
    });

    it('pre-renders a converted duration without its suffix', () => {
      const { format, prerender } = mapFormat(
        { id: 'duration', params: { inputFormat: 'seconds', outputFormat: 'asMinutes' } },
        'number'
      );
      expect(format).toBeUndefined();
      expect(prerender).toBeDefined();
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
      expect(format).toEqual(expect.objectContaining({ kind: 'number', suffix: ' req' }));
      expect(isomerText(format!, 2)).toBe(toText(2));
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
