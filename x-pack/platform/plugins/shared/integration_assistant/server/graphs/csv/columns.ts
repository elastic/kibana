/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Estimates from above the number of columns in the CSV samples.
export function upperBoundForColumnCount(csvSamples: string[]): number {
  return Math.max(0, ...csvSamples.map((sample) => sample.split(',').length));
}

// Generates a list of temporary column names.
export function generateColumnNames(count: number): string[] {
  return Array.from({ length: count }).map((_, i) => `column${i + 1}`);
}

// Converts a column name into a safe one to use in the `if ctx...` clause.
// Result must pass rules at https://www.elastic.co/guide/en/elasticsearch/painless/8.15/painless-identifiers.html
export function toSafeColumnName(columnName: unknown): string | undefined {
  if (typeof columnName === 'number') {
    return `Column${columnName}`;
  }
  if (typeof columnName !== 'string') {
    return undefined;
  }
  if (columnName.length === 0) {
    return undefined;
  }
  const safeName = columnName.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[0-9]/.test(safeName) ? `Column${safeName}` : safeName;
}

/**
 * Extracts column names from the provided header doc by truncating unnecessary columns
 * and converting each name into a normalized format.
 *
 * @param tempColumnNames - The list of temporary column names (integer-based).
 * @param headerObject - The processed first document (corresponding to the header row).
 * @returns A filtered array of valid column names in a safe format or undefined where the value was neither string nor numbers.
 */
export function columnsFromHeader(
  tempColumnNames: string[],
  headerObject: { [key: string]: unknown }
): Array<string | undefined> {
  return valuesFromHeader(tempColumnNames, headerObject).map(toSafeColumnName);
}

/**
 * Extracts values from a header object based on column names, converting non-string/numeric values to undefined.
 * The function processes the array up to the last non-undefined value in the header object.
 *
 * @param tempColumnNames - Array of column names to look up in the header object
 * @param headerObject - Object containing header values indexed by column names
 * @returns Array of string/number values or undefined for non-string/number values, truncated at the last non-undefined entry
 *
 * @example
 * const columns = ['col1', 'col2', 'col3', 'col4'];
 * const header = { col1: 'value1', col2: 123, col3: 'value3', 'col4': null };
 * valuesFromHeader(columns, header); // ['value1', 123, 'value3', undefined]
 */
export function valuesFromHeader(
  tempColumnNames: string[],
  headerObject: { [key: string]: unknown }
): Array<string | number | undefined> {
  const maxIndex = tempColumnNames.findLastIndex(
    (columnName) => headerObject[columnName] !== undefined
  );
  return tempColumnNames
    .slice(0, maxIndex + 1)
    .map((columnName) => headerObject[columnName])
    .map((value) => (typeof value === 'string' || typeof value === 'number' ? value : undefined));
}

/**
 * Calculates the total number of columns in a CSV by going through the processed
 * documents to find the last defined value across all rows.
 *
 * @param tempColumnNames - An array of column names used to reference CSV row properties.
 * @param csvRows - An array of row objects representing CSV data, where each key
 * corresponds to a column name from `tempColumnNames`.
 * @returns The total number of columns, determined by the position of the last
 * defined value across all rows.
 */
export function totalColumnCount(
  tempColumnNames: string[],
  csvRows: Array<{ [key: string]: unknown }>
): number {
  return (
    Math.max(
      -1,
      ...csvRows.map((row) =>
        tempColumnNames.findLastIndex((columnName) => row[columnName] !== undefined)
      )
    ) + 1
  );
}
// Prefixes each column with the provided prefixes, separated by a period.
export function prefixColumns(columns: string[], prefixes: string[]): string[] {
  return columns.map((column) => [...prefixes, column].join('.'));
}
/**
 * Generates a list of unique column names based on preferred and fallback names.
 *
 * The preferred names are used first, followed by the fallback names. It is required that
 * there are enough fallback names to cover the number of unique column names needed.
 *
 * The resulting column names are guaranteed to be unique. If a column name is already in use,
 * a postfix like _2, _3 and so on is added to the name to make it unique.
 *
 * @generator
 * @param {number} count - The number of unique column names to generate.
 * @param {Array<Array<string | undefined>>} preferredNames - A 2D array where each sub-array contains a list of names.
 * @param {string[]} fallbackNames - An array of fallback names to use if no preferred name is defined.
 * @yields {string} - A sequence of column names, such that no two are the same.
 */

export function* yieldUniqueColumnNames(
  count: number,
  preferredNames: Array<Array<string | undefined>>,
  fallbackNames: string[]
): Generator<string, void> {
  const knownNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let selectedName: string = fallbackNames[i];

    for (const nameList of preferredNames) {
      const name = nameList[i];
      if (name) {
        selectedName = name;
        break;
      }
    }

    let postfixString = '';

    if (knownNames.has(selectedName)) {
      for (let postfix = 2; ; postfix++) {
        postfixString = `_${postfix}`;
        if (!knownNames.has(selectedName + postfixString)) {
          break;
        }
      }
    }

    selectedName += postfixString;
    knownNames.add(selectedName);
    yield selectedName;
  }
}
