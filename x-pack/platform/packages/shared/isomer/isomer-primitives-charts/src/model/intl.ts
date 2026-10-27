/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** How many formatters of each kind stay cached; options come from a few formats and time zones. */
const MAX_FORMATTERS = 256;

/**
 * Formatters by locale and options. Building an `Intl` formatter costs far more than using one, and a chart
 * formats every value it labels, so each distinct one is built once.
 */
const cached = <T>(make: (locale: string, options: object) => T) => {
  const formatters = new Map<string, T>();
  return (locale: string, options: object): T => {
    const key = `${locale}|${JSON.stringify(options)}`;
    const found = formatters.get(key);
    if (found !== undefined) {
      return found;
    }
    const formatter = make(locale, options);
    formatters.set(key, formatter);
    const [oldest] = formatters.keys();
    if (formatters.size > MAX_FORMATTERS && oldest !== undefined) {
      formatters.delete(oldest);
    }
    return formatter;
  };
};

/** A shared `Intl.NumberFormat` for `locale` and `options`. */
export const numberFormat: (
  locale: string,
  options: Intl.NumberFormatOptions
) => Intl.NumberFormat = cached((locale, options) => new Intl.NumberFormat(locale, options));

/** A shared `Intl.DateTimeFormat` for `locale` and `options`. */
export const dateTimeFormat: (
  locale: string,
  options: Intl.DateTimeFormatOptions
) => Intl.DateTimeFormat = cached((locale, options) => new Intl.DateTimeFormat(locale, options));
