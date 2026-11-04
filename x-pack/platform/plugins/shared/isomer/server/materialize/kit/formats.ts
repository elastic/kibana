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
  /** `format:number:defaultLocale`, the Numeral.js locale every numeral format uses. */
  numberLocale: string;
}

/** How a column's Kibana field format reaches a chart node. */
export interface FormatMapping {
  /** The portable format, when the field format has one. */
  format?: PortableFormat;
  /** Kibana's own text for a value, for `display` strings. */
  toText: (value: unknown) => string;
  /** Set when every value must arrive as a `display` string: why the format has no portable form. */
  prerender?: string;
  /** Set when Kibana's server has no such format, so values arrive unformatted: why. */
  dropped?: string;
  /** Raw values the format shows as labels, such as the Other and missing buckets. */
  labels?: Record<string, string>;
}

const OTHER_BUCKET = '__other__';
const MISSING_BUCKET = '__missing__';

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

const DURATION_OUTPUTS: Record<string, Extract<PortableFormat, { kind: 'duration' }>['output']> = {
  humanize: 'humanize',
  humanizePrecise: 'humanizePrecise',
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
  { numberLocale }: FormatSettings,
  suffix?: string
): PortableFormat => ({
  kind,
  pattern: String(instance.param('pattern')),
  ...(numberLocale && numberLocale !== 'en' ? { locale: numberLocale } : {}),
  ...(instance.param('alwaysShowSign') ? { alwaysShowSign: true } : {}),
  ...(suffix ? { suffix } : {}),
});

const durationFormat = (instance: FieldFormat): PortableFormat | undefined => {
  const input = String(instance.param('inputFormat'));
  const output = DURATION_OUTPUTS[String(instance.param('outputFormat'))];
  if (!DURATION_INPUTS.has(input) || !output) {
    return undefined;
  }
  const decimals = instance.param('outputPrecision');
  return {
    kind: 'duration',
    input: input as DurationUnit,
    output,
    ...(typeof decimals === 'number' ? { decimals } : {}),
    ...(instance.param('showSuffix') ? { showSuffix: true } : {}),
    ...(instance.param('useShortSuffix') ? { useShortSuffix: true } : {}),
    ...(instance.param('includeSpaceWithSuffix') === false
      ? { includeSpaceWithSuffix: false }
      : {}),
  };
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
        (format.kind === 'number' || format.kind === 'percent' || format.kind === 'bytes');
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

    switch (id) {
      case 'number':
      case 'bytes':
        return { format: numeralFormat(id, instance, settings), toText };
      case 'percent':
        return instance.param('fractional') === false
          ? prerender(
              i18n.translate('xpack.isomer.materialize.format.wholePercent', {
                defaultMessage: 'Percentages stored as whole numbers have no portable format.',
              })
            )
          : { format: numeralFormat('percent', instance, settings), toText };
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
      case 'date':
        return {
          format: { kind: 'date', pattern: String(instance.param('pattern')), timeZone },
          toText,
        };
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
