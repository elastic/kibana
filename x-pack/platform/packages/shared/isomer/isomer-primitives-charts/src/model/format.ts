/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Formatting is fixed to `en-US` so every surface and every host prints the same text for the same node.

import { z } from '@elastic/isomer-sdk';

import { glyph } from '../theme/glyph';

import { crossRefine } from './cross_field';
import { numberFormat } from './intl';
import { labelText } from './text';

const LOCALE = 'en-US';

export const FORMAT_STYLES = ['number', 'percent', 'currency', 'bytes', 'duration'] as const;

const currencyRule = 'currency is set exactly when style is `currency`';
const unitRule = 'unit is set only when style is `number`';
const durationRule = 'durationUnit is set only when style is `duration`';
const affixRule = 'prefix and suffix are not set when style is `currency`';

export const formatSchema = () =>
  z
    .object({
      style: z
        .enum(FORMAT_STYLES)
        .describe(
          '`number`; `percent` for a ratio, so 0.25 prints 25%; `currency`; `bytes`, printed in 1024 steps as B, KB, MB; `duration`, printed in the largest whole unit.'
        ),
      precision: z
        .number()
        .int()
        .min(0)
        .max(20)
        .describe(
          'Exactly this many decimal places. Leave it out to print up to two, and up to one for `percent`, `bytes`, and `duration`.'
        )
        .optional(),
      compact: z
        .boolean()
        .describe('Abbreviates large numbers as 1.2K or 3.4M. Applies to `number` and `currency`.')
        .optional(),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .describe(`An ISO 4217 code such as \`USD\`. The ${currencyRule}.`)
        .optional(),
      unit: labelText()
        .describe(
          `What a plain number counts, printed after it, e.g. \`ms\` or \`req/s\`. The ${unitRule}.`
        )
        .optional(),
      durationUnit: z
        .enum(['ms', 's'])
        .describe(`The unit duration values are given in. Defaults to \`ms\`. The ${durationRule}.`)
        .optional(),
      prefix: labelText()
        .describe(
          `Literal text printed before the number, after any sign, e.g. \`$\` for a host whose amounts carry no currency code. The ${affixRule}.`
        )
        .optional(),
      suffix: labelText()
        .describe(
          `Literal text printed right after the number and its unit, e.g. \` USD\`. The ${affixRule}.`
        )
        .optional(),
    })
    .strict()
    .check(
      crossRefine(({ style, currency }) => (style === 'currency') === (currency !== undefined), {
        error: currencyRule,
        path: ['currency'],
        rule: currencyRule,
      })
    )
    .check(
      crossRefine(({ style, unit }) => unit === undefined || style === 'number', {
        error: unitRule,
        path: ['unit'],
        rule: unitRule,
      })
    )
    .check(
      crossRefine(({ style, durationUnit }) => durationUnit === undefined || style === 'duration', {
        error: durationRule,
        path: ['durationUnit'],
        rule: durationRule,
      })
    )
    .check(
      crossRefine(
        ({ style, prefix, suffix }) =>
          style !== 'currency' || (prefix === undefined && suffix === undefined),
        { error: affixRule, path: ['prefix'], rule: affixRule }
      )
    )
    .describe('How values print on every surface and on the axis.');

export type ValueFormat = z.infer<ReturnType<typeof formatSchema>>;

const digits = (precision: number | undefined, fallbackMax: number): Intl.NumberFormatOptions =>
  precision === undefined
    ? { minimumFractionDigits: 0, maximumFractionDigits: fallbackMax }
    : { minimumFractionDigits: precision, maximumFractionDigits: precision };

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/** Each unit and how many of the next smaller one it holds. */
const DURATION_STEPS = [
  ['ms', 1000],
  ['s', 60],
  ['min', 60],
  ['h', 24],
  ['d', Infinity],
] as const;

/** A unit that is a word takes the theme's gap; a symbol such as `%` sits against the number. */
const withUnit = (number: string, unit: string): string =>
  /^[\p{L}\p{N}]/u.test(unit) ? `${number}${glyph.unitGap}${unit}` : `${number}${unit}`;

const scaled = (value: number, units: readonly (readonly [string, number])[]): [number, string] => {
  let amount = value;
  for (const [index, [unit, next]] of units.entries()) {
    if (Math.abs(amount) < next || index === units.length - 1) {
      return [amount, unit];
    }
    amount /= next;
  }
  return [amount, units[0]![0]];
};

const withAffixes = (
  printed: string,
  { prefix = '', suffix = '' }: Pick<ValueFormat, 'prefix' | 'suffix'>
): string => {
  const sign = printed.startsWith('-') ? '-' : '';
  return `${sign}${prefix}${printed.slice(sign.length)}${suffix}`;
};

const printNumber = (input: number, format: ValueFormat | undefined): string => {
  // `-0` passes `.min(0)` and would print with a sign.
  const value = input === 0 ? 0 : input;
  const { style = 'number', precision, compact, currency, unit } = format ?? {};
  switch (style) {
    case 'percent':
      return numberFormat(LOCALE, {
        style: 'percent',
        ...digits(precision, 1),
      }).format(value);
    case 'currency':
      return numberFormat(LOCALE, {
        style: 'currency',
        currency,
        ...(compact
          ? { notation: 'compact', ...digits(precision, 2) }
          : precision === undefined
          ? {}
          : digits(precision, 2)),
      }).format(value);
    case 'bytes': {
      const [amount, byteUnit] = scaled(
        value,
        BYTE_UNITS.map((name) => [name, 1024] as const)
      );
      return withUnit(numberFormat(LOCALE, digits(precision, 1)).format(amount), byteUnit);
    }
    case 'duration': {
      const ms = format?.durationUnit === 's' ? value * 1000 : value;
      const [amount, durationUnit] = scaled(ms, DURATION_STEPS);
      return withUnit(numberFormat(LOCALE, digits(precision, 1)).format(amount), durationUnit);
    }
    default: {
      const number = numberFormat(LOCALE, {
        ...(compact ? { notation: 'compact' } : {}),
        ...digits(precision, 2),
      }).format(value);
      return unit === undefined ? number : withUnit(number, unit);
    }
  }
};

/** `value` as every surface prints it; `null`, and a result that is not a finite number, print as missing. */
export const formatValue = (input: number | null, format: ValueFormat | undefined): string =>
  input === null || !Number.isFinite(input)
    ? glyph.missing
    : withAffixes(printNumber(input, format), format ?? {});
