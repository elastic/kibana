/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  FieldFormat,
  IFieldFormatsRegistry,
  SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import type { DurationUnit, PortableFormat } from '@kbn/isomer';
import type { ChartColumnType } from './types';

/** The Kibana settings formats default to, read once per request. */
export interface FormatSettings {
  /** `dateFormat:tz`. `Browser` formats as UTC on the server, as Kibana's server date format does. */
  dateFormatTz: string;
  /** `format:number:defaultLocale`, the Numeral.js locale; charts resolve in its `Intl` locale. */
  numberLocale: string;
}

// Shared with the charts render context, so materialized formats and resolved charts agree.
export { intlLocaleFor } from '@kbn/isomer';

/** How a column's Kibana field format reaches a chart node. */
export interface FormatMapping {
  /** The portable format, when the field format has one. */
  format?: PortableFormat;
  /** Kibana's own text for a value, for `display` strings. */
  toText: (value: unknown) => string;
  /** Set when every value must arrive as a `display` string: why the format has no portable form. */
  prerender?: string;
  /** Set when the portable format is the nearest one but drops part of Kibana's: what. */
  approximated?: string;
  /** Set when Kibana's server has no such format, so values arrive unformatted: why. */
  dropped?: string;
  /** Raw values the format shows as labels, such as the Other and missing buckets. */
  labels?: Record<string, string>;
}

const OTHER_BUCKET = '__other__';
const MISSING_BUCKET = '__missing__';

type NumberFormat = Extract<PortableFormat, { kind: 'number' }>;
type DurationFormat = Extract<PortableFormat, { kind: 'duration' }>;
type DateFormat = Extract<PortableFormat, { kind: 'date' }>;

/** The `Intl` options a Numeral.js pattern's number part states, or undefined if it states more. */
interface NumeralParts {
  options: Omit<NumberFormat, 'kind' | 'notation' | 'suffix'>;
  compact: boolean;
  /** A trailing unit: `%`, or a byte or bit unit and its base. */
  unit?: { kind: 'percent' } | { kind: 'bytes' | 'bits'; base: 1000 | 1024 };
}

const NUMERAL_NUMBER = /^(0+)(,0+)?(?:(\.|\[\.\])(0*)(?:\[(0+)\])?)?$/;

/**
 * Reads a Numeral.js pattern, such as Kibana's default `0,0.[000]`, as `Intl.NumberFormat`
 * options. Patterns with currency, ordinals, exponents, times or literal text return undefined,
 * so the column is pre-rendered instead.
 */
export const parseNumeralPattern = (pattern: string): NumeralParts | undefined => {
  let rest = pattern.trim();
  let signDisplay: NumberFormat['signDisplay'];
  if (rest.startsWith('+')) {
    signDisplay = 'exceptZero';
    rest = rest.slice(1);
  }
  let unit: NumeralParts['unit'];
  const unitMatch = /\s?(bitd|bitb|bd|bb|b|%)$/.exec(rest);
  if (unitMatch) {
    const [match, token] = unitMatch;
    rest = rest.slice(0, -match.length);
    unit =
      token === '%'
        ? { kind: 'percent' }
        : {
            kind: token.startsWith('bit') ? 'bits' : 'bytes',
            base: token === 'bitd' || token === 'bd' ? 1000 : 1024,
          };
  }
  let compact = false;
  if (/\s?a$/.test(rest)) {
    compact = true;
    rest = rest.replace(/\s?a$/, '');
  }
  const number = NUMERAL_NUMBER.exec(rest);
  if (!number) {
    return undefined;
  }
  const [, , grouping, point, required = '', optional = ''] = number;
  const optionalPoint = point === '[.]';
  const minimumFractionDigits = optionalPoint ? 0 : required.length;
  const maximumFractionDigits = required.length + optional.length;
  return {
    options: {
      minimumFractionDigits,
      maximumFractionDigits,
      ...(grouping ? {} : { useGrouping: false }),
      ...(signDisplay ? { signDisplay } : {}),
    },
    compact,
    ...(unit ? { unit } : {}),
  };
};

const DURATION_INPUTS: ReadonlySet<string> = new Set<DurationUnit>([
  'picoseconds',
  'nanoseconds',
  'microseconds',
  'milliseconds',
  'seconds',
  'minutes',
  'hours',
  'days',
  'weeks',
  'months',
  'years',
]);

const DURATION_OUTPUTS: Record<string, NonNullable<DurationFormat['output']>> = {
  asNanoseconds: 'nanoseconds',
  asMicroseconds: 'microseconds',
  asMilliseconds: 'milliseconds',
  asSeconds: 'seconds',
  asMinutes: 'minutes',
  asHours: 'hours',
  asDays: 'days',
  asWeeks: 'weeks',
  asMonths: 'months',
  asYears: 'years',
};

const numeralFormat = (
  kind: 'number' | 'percent' | 'bytes',
  instance: FieldFormat,
  suffix?: string
): PortableFormat | undefined => {
  const parsed = parseNumeralPattern(String(instance.param('pattern') ?? ''));
  if (!parsed) {
    return undefined;
  }
  const { options, compact, unit } = parsed;
  const sign = instance.param('alwaysShowSign') ? { signDisplay: 'exceptZero' as const } : {};
  const tail = suffix ? { suffix } : {};
  // Numeral.js writes byte and bit units short, such as `1.5KB`, which `narrow` is nearest to.
  if (unit?.kind === 'bytes' || unit?.kind === 'bits') {
    return compact
      ? undefined
      : { kind: unit.kind, ...options, ...sign, base: unit.base, unitDisplay: 'narrow', ...tail };
  }
  if (unit?.kind === 'percent' || kind === 'percent') {
    return compact ? undefined : { kind: 'percent', ...options, ...sign, ...tail };
  }
  if (kind === 'bytes') {
    return compact
      ? undefined
      : { kind: 'bytes', ...options, ...sign, unitDisplay: 'narrow', ...tail };
  }
  return {
    kind: 'number',
    ...options,
    ...sign,
    ...(compact ? { notation: 'compact' as const } : {}),
    ...tail,
  };
};

const durationFormat = (instance: FieldFormat): PortableFormat | undefined => {
  const input = String(instance.param('inputFormat'));
  const outputFormat = String(instance.param('outputFormat'));
  if (!DURATION_INPUTS.has(input)) {
    return undefined;
  }
  const decimals = instance.param('outputPrecision');
  const unitDisplay = instance.param('useShortSuffix') ? ('narrow' as const) : ('long' as const);
  if (outputFormat === 'humanize') {
    // Moment's humanize words ("a few seconds", "2 hours") are nearest to whole units, long.
    return {
      kind: 'duration',
      input: input as DurationUnit,
      output: 'auto',
      maximumFractionDigits: 0,
      unitDisplay: 'long',
    };
  }
  if (outputFormat === 'humanizePrecise') {
    return {
      kind: 'duration',
      input: input as DurationUnit,
      output: 'auto',
      minimumFractionDigits: typeof decimals === 'number' ? decimals : 2,
      maximumFractionDigits: typeof decimals === 'number' ? decimals : 2,
      unitDisplay,
    };
  }
  const output = DURATION_OUTPUTS[outputFormat];
  // Without its suffix, Kibana prints a bare converted number, which no portable format does.
  if (!output || !instance.param('showSuffix')) {
    return undefined;
  }
  return {
    kind: 'duration',
    input: input as DurationUnit,
    output,
    ...(typeof decimals === 'number'
      ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
      : {}),
    unitDisplay,
  };
};

const MOMENT_TOKENS =
  /\[[^\]]*\]|YYYY|YY|MMMM|MMM|MM|Mo|M|DDDD|DDD|Do|DD|D|dddd|ddd|dd|d|HH|H|hh|h|kk|k|mm|m|ss|s|SSS+|SS|S|A|a|ZZ|Z|zz|z|X|x|Qo|Q|wo|ww|w|Wo|WW|W|gggg|gg|GGGG|GG|E|e|LTS|LT|LLLL|LLL|LL|L|llll|lll|ll|l/g;

/**
 * Reads a moment.js pattern, such as Kibana's default `MMM D, YYYY @ HH:mm:ss.SSS`, as the
 * nearest `Intl.DateTimeFormat` fields. `Intl` orders fields by locale and drops literal text,
 * such as the `@`, so the layout can differ; the fields shown are the same. Tokens with no `Intl`
 * field, such as quarters and week numbers, are dropped, and returned so the caller can say so.
 */
export const parseMomentPattern = (
  pattern: string
): { options: Omit<DateFormat, 'kind' | 'timeZone'>; dropped: string[] } => {
  const options: Omit<DateFormat, 'kind' | 'timeZone'> = {};
  const dropped: string[] = [];
  for (const [token] of pattern.matchAll(MOMENT_TOKENS)) {
    switch (token) {
      case 'YYYY':
        options.year = 'numeric';
        break;
      case 'YY':
        options.year = '2-digit';
        break;
      case 'MMMM':
        options.month = 'long';
        break;
      case 'MMM':
        options.month = 'short';
        break;
      case 'MM':
        options.month = '2-digit';
        break;
      case 'M':
      case 'Mo':
        options.month = 'numeric';
        break;
      case 'DD':
        options.day = '2-digit';
        break;
      case 'D':
      case 'Do':
        options.day = 'numeric';
        break;
      case 'dddd':
        options.weekday = 'long';
        break;
      case 'ddd':
        options.weekday = 'short';
        break;
      case 'dd':
      case 'd':
        options.weekday = 'narrow';
        break;
      case 'HH':
      case 'kk':
        options.hour = '2-digit';
        options.hour12 = false;
        break;
      case 'H':
      case 'k':
        options.hour = 'numeric';
        options.hour12 = false;
        break;
      case 'hh':
        options.hour = '2-digit';
        options.hour12 = true;
        break;
      case 'h':
        options.hour = 'numeric';
        options.hour12 = true;
        break;
      case 'A':
      case 'a':
        options.hour12 = true;
        break;
      case 'mm':
      case 'm':
        options.minute = '2-digit';
        break;
      case 'ss':
      case 's':
        options.second = '2-digit';
        break;
      case 'S':
        options.fractionalSecondDigits = 1;
        break;
      case 'SS':
        options.fractionalSecondDigits = 2;
        break;
      case 'ZZ':
      case 'Z':
        options.timeZoneName = 'longOffset';
        break;
      case 'zz':
      case 'z':
        options.timeZoneName = 'short';
        break;
      case 'LTS':
        options.timeStyle = 'medium';
        break;
      case 'LT':
        options.timeStyle = 'short';
        break;
      case 'LLLL':
      case 'llll':
        options.dateStyle = 'full';
        options.timeStyle = 'short';
        break;
      case 'LLL':
      case 'lll':
        options.dateStyle = 'long';
        options.timeStyle = 'short';
        break;
      case 'LL':
      case 'll':
        options.dateStyle = 'long';
        break;
      case 'L':
      case 'l':
        options.dateStyle = 'short';
        break;
      default:
        if (token.startsWith('SSS')) {
          options.fractionalSecondDigits = 3;
        } else if (!token.startsWith('[')) {
          dropped.push(token);
        }
    }
  }
  // `Intl` refuses styles mixed with fields, so a pattern mixing them keeps its fields.
  const fields = Object.keys(options).filter(
    (key) => !['dateStyle', 'timeStyle', 'hour12'].includes(key)
  );
  if ((options.dateStyle || options.timeStyle) && fields.length > 0) {
    delete options.dateStyle;
    delete options.timeStyle;
  }
  if (options.minute && !options.hour && options.hour12 === undefined) {
    // A minute without its hour is a duration-like pattern; Intl needs the hour to place it.
    options.hour = '2-digit';
  }
  return { options, dropped };
};

const defaultFormatFor = (type: ChartColumnType): SerializedFieldFormat => {
  switch (type) {
    case 'number':
      return { id: 'number' };
    case 'date':
      return { id: 'date' };
    case 'boolean':
      return { id: 'boolean' };
    default:
      return { id: 'string' };
  }
};

/**
 * Maps Kibana field formats, as `Datatable` column meta carries them, to Isomer's portable
 * formats. A format with no portable form is pre-rendered with Kibana's own formatter.
 */
export const createFormatMapper = (registry: IFieldFormatsRegistry, settings: FormatSettings) => {
  const timeZoneFor = (requested?: string): string => {
    const timeZone = requested ?? settings.dateFormatTz;
    return timeZone === 'Browser' ? 'UTC' : timeZone;
  };

  const mapFormat = (
    serialized: SerializedFieldFormat | undefined,
    type: ChartColumnType,
    requestedTimeZone?: string
  ): FormatMapping => {
    const { id = 'string', params = {} } = serialized?.id ? serialized : defaultFormatFor(type);
    const timeZone = timeZoneFor(requestedTimeZone);

    if (id === 'terms') {
      const inner = mapFormat(params as SerializedFieldFormat, type, requestedTimeZone);
      const { otherBucketLabel, missingBucketLabel } = params as {
        otherBucketLabel?: string;
        missingBucketLabel?: string;
      };
      return {
        ...inner,
        labels: {
          ...(otherBucketLabel ? { [OTHER_BUCKET]: String(otherBucketLabel) } : {}),
          ...(missingBucketLabel ? { [MISSING_BUCKET]: String(missingBucketLabel) } : {}),
        },
      };
    }

    if (id === 'suffix') {
      const { suffixString, unit, ...nested } = params as {
        suffixString?: string;
        unit?: string;
        id?: string;
        params?: SerializedFieldFormat['params'];
      };
      const inner = mapFormat(
        nested.id ? { id: nested.id, params: nested.params } : undefined,
        type,
        requestedTimeZone
      );
      if (unit) {
        return {
          ...inner,
          dropped: i18n.translate('xpack.isomer.materialize.format.timeScaleDropped', {
            defaultMessage: 'The "{unit}" time scale suffix is not available on the server.',
            values: { unit },
          }),
        };
      }
      const { format } = inner;
      const numeral =
        format &&
        (format.kind === 'number' ||
          format.kind === 'percent' ||
          format.kind === 'bytes' ||
          format.kind === 'bits');
      return numeral && suffixString
        ? {
            ...inner,
            format: { ...format, suffix: `${format.suffix ?? ''}${suffixString}` },
            toText: (value) => {
              const text = inner.toText(value);
              return text === '' ? text : `${text}${suffixString}`;
            },
          }
        : inner;
    }

    if (!registry.getType(id)) {
      return {
        toText: (value) => (value == null ? '' : String(value)),
        dropped: i18n.translate('xpack.isomer.materialize.format.unavailable', {
          defaultMessage: 'The "{id}" field format is not available on the server.',
          values: { id },
        }),
      };
    }

    const instance = registry.getInstance(id, params);
    const toText = (value: unknown) => instance.convertToText(value, { timezone: timeZone });
    const prerender = (why: string): FormatMapping => ({ toText, prerender: why });

    const numeralPattern = () =>
      prerender(
        i18n.translate('xpack.isomer.materialize.format.numeralPattern', {
          defaultMessage: 'The "{pattern}" number pattern has no portable form.',
          values: { pattern: String(instance.param('pattern')) },
        })
      );

    switch (id) {
      case 'number':
      case 'bytes': {
        const format = numeralFormat(id, instance);
        return format ? { format, toText } : numeralPattern();
      }
      case 'percent': {
        const format = numeralFormat('percent', instance);
        if (!format) {
          return numeralPattern();
        }
        return {
          format:
            format.kind === 'percent' && instance.param('fractional') === false
              ? { ...format, fractional: false }
              : format,
          toText,
        };
      }
      case 'duration': {
        const format = durationFormat(instance);
        return format
          ? { format, toText }
          : prerender(
              i18n.translate('xpack.isomer.materialize.format.duration', {
                defaultMessage: 'This duration format has no portable form.',
              })
            );
      }
      case 'date': {
        const { options, dropped } = parseMomentPattern(String(instance.param('pattern')));
        return {
          format: { kind: 'date', ...options, timeZone },
          toText,
          ...(dropped.length > 0
            ? {
                approximated: i18n.translate('xpack.isomer.materialize.format.dateTokens', {
                  defaultMessage:
                    "The date pattern's {tokens} {count, plural, one {part has} other {parts have}} no portable form.",
                  values: { tokens: dropped.join(', '), count: dropped.length },
                }),
              }
            : {}),
        };
      }
      case 'string':
        return instance.param('transform')
          ? prerender(
              i18n.translate('xpack.isomer.materialize.format.stringTransform', {
                defaultMessage: 'The "{transform}" string transform has no portable form.',
                values: { transform: String(instance.param('transform')) },
              })
            )
          : { format: { kind: 'text' }, toText };
      case 'boolean':
      case 'ip':
        return { format: { kind: 'text' }, toText };
      default:
        return prerender(
          i18n.translate('xpack.isomer.materialize.format.notPortable', {
            defaultMessage: 'The "{id}" field format has no portable form.',
            values: { id },
          })
        );
    }
  };

  return mapFormat;
};

export type FormatMapper = ReturnType<typeof createFormatMapper>;
