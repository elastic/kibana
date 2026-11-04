/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import {
  DEFAULT_DURATION_INPUT_FORMAT,
  DEFAULT_DURATION_OUTPUT_FORMAT,
} from '@kbn/field-formats-plugin/common';
import type { LensApiFormat } from './types';

const NUMBER_DECIMALS_DEFAULT = 2;
const DURATION_DECIMALS_DEFAULT = 0;
const DURATION_COMPACT_DEFAULT = true;

const DURATION_INPUT_UNITS: Readonly<Record<string, string>> = {
  ps: 'picoseconds',
  ns: 'nanoseconds',
  us: 'microseconds',
  ms: 'milliseconds',
  s: 'seconds',
  min: 'minutes',
  h: 'hours',
  d: 'days',
  w: 'weeks',
  mo: 'months',
  y: 'years',
};

const DURATION_OUTPUT_UNITS: Readonly<Record<string, string>> = {
  'auto-approximate': 'humanize',
  auto: 'humanizePrecise',
  ms: 'asMilliseconds',
  s: 'asSeconds',
  min: 'asMinutes',
  h: 'asHours',
  d: 'asDays',
  w: 'asWeeks',
  mo: 'asMonths',
  y: 'asYears',
};

const numeralPattern = (decimals: number, compact: boolean, unit: string): string =>
  decimals === 0
    ? `0,0${compact ? 'a' : ''}${unit}`
    : `0,0.${'0'.repeat(decimals)}${compact ? 'a' : ''}${unit}`;

const withSuffix = (
  format: SerializedFieldFormat,
  suffix: string | undefined
): SerializedFieldFormat =>
  suffix
    ? { id: 'suffix', params: { ...format, suffixString: suffix, formatOverride: true } }
    : format;

/**
 * The field format Lens gives a column whose Lens API config sets `format`: the params Lens's
 * `lens_format_column` expression sets, from the state Lens's API transform builds.
 */
export const toLensFieldFormat = (format: LensApiFormat): SerializedFieldFormat => {
  switch (format.type) {
    case 'number':
    case 'percent': {
      const decimals = format.decimals ?? NUMBER_DECIMALS_DEFAULT;
      return withSuffix(
        {
          id: format.type,
          params: {
            pattern: numeralPattern(
              decimals,
              Boolean(format.compact),
              format.type === 'percent' ? '%' : ''
            ),
            formatOverride: true,
            decimals,
          },
        },
        format.suffix
      );
    }
    case 'bytes':
    case 'bits': {
      const decimals = format.decimals ?? NUMBER_DECIMALS_DEFAULT;
      return withSuffix(
        {
          id: 'bytes',
          params: {
            pattern: numeralPattern(decimals, false, format.type === 'bytes' ? 'b' : 'bitd'),
            formatOverride: true,
            decimals,
          },
        },
        format.suffix
      );
    }
    case 'duration': {
      const outputFormat =
        DURATION_OUTPUT_UNITS[format.to] ?? DEFAULT_DURATION_OUTPUT_FORMAT.method;
      const approximate = outputFormat === 'humanize';
      const decimals = approximate
        ? DURATION_DECIMALS_DEFAULT
        : format.decimals ?? DURATION_DECIMALS_DEFAULT;
      const compact = !approximate && (format.compact ?? DURATION_COMPACT_DEFAULT);
      return withSuffix(
        {
          id: 'duration',
          params: {
            pattern: '',
            formatOverride: true,
            inputFormat: DURATION_INPUT_UNITS[format.from] ?? DEFAULT_DURATION_INPUT_FORMAT.kind,
            outputFormat,
            outputPrecision: decimals,
            useShortSuffix: compact,
            showSuffix: true,
            includeSpaceWithSuffix: true,
            decimals,
          },
        },
        format.suffix
      );
    }
    case 'custom':
      return {
        id: 'number',
        params: { pattern: format.pattern, formatOverride: true, decimals: 0 },
      };
  }
};

/**
 * `table` with each named column formatted as Lens formats it. As in Lens, only `number` columns
 * take a Lens format; dates and strings keep the format their query gave them.
 */
export const applyLensFormats = (
  table: Datatable,
  formats: ReadonlyMap<string, LensApiFormat>
): Datatable => {
  if (formats.size === 0) {
    return table;
  }
  return {
    ...table,
    columns: table.columns.map((column): DatatableColumn => {
      const format = formats.get(column.id);
      return format && column.meta.type === 'number'
        ? { ...column, meta: { ...column.meta, params: toLensFieldFormat(format) } }
        : column;
    }),
  };
};
