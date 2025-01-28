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
// Returns the column list from a header row. We skip values that are not strings.

export function columnsFromHeader(
  tempColumnNames: string[],
  headerObject: { [key: string]: unknown }
): Array<string | undefined> {
  const maxIndex = tempColumnNames.findLastIndex(
    (columnName) => headerObject[columnName] !== undefined
  );
  return tempColumnNames
    .slice(0, maxIndex + 1)
    .map((columnName) => headerObject[columnName])
    .map(toSafeColumnName);
}
// Count the number of columns actually present in the rows.

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
