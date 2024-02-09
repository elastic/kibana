/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Note on the form validation and input components used:
 * All inputs use `EuiFieldText` which means all form values will be treated as strings.
 * This implies that formats other than strings, like numbers from the config, are initially cast to strings,
 * then revalidated and cast back to their original format, such as number, before submitting an update.
 * This approach allows for fine-grained control over field validation and the option to cast to special values like `null`.
 */

/**
 * An object aggregating three different value parser functions.
 */
export const valueParsers = {
  /**
   * A parser function that returns the input string value unchanged.
   * @param {string} v - The string value to parse.
   * @returns {string} The unchanged input string value.
   */
  defaultParser(v: string): string {
    return v;
  },
  /**
   * A parser function that converts an input string to a number or null.
   * It returns null if the input string is empty; otherwise, it converts the string to a number.
   * @param {string} v - The string value to parse.
   * @returns {number | null} The parsed number or null if the input is an empty string.
   */
  nullableNumberParser(v: string): number | null {
    return v === '' ? null : +v;
  },
  /**
   * A parser function that converts an input string to a number or NaN.
   * It returns NaN if the input string is empty; otherwise, it converts the string to a number.
   * @param {string} v - The string value to parse.
   * @returns {number} The parsed number or NaN if the input is an empty string.
   */
  numberParser(v: string): number {
    return v === '' ? NaN : +v;
  },
};

/**
 * Type alias for the keys of the `valueParsers` object.
 */
export type ValueParserName = keyof typeof valueParsers;
