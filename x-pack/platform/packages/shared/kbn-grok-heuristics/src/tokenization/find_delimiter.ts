/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Determines the most suitable delimiter from a predefined set by analyzing
 * the frequency of each delimiter across a list of messages. The delimiter
 * with the highest minimum occurrence across all messages is selected.
 *
 * @param messages - An array of strings to analyze for delimiter patterns.
 * @returns The most suitable delimiter
 */
export function findDelimiter(messages: string[]): string {
  // Note: Colons can't be used as delimiters since they are already used inside capture groups (e.g. `%{WORD:0}`)
  const delimiterOptions = [
    { id: '\\|', pattern: /\|/g },
    { id: ',', pattern: /,/g },
    { id: '\\s', pattern: /\s+/g },
    { id: '\\t', pattern: /\t+/g },
    { id: ';', pattern: /;/g },
  ];

  // Count occurrences of each delimiter for each message and pick the lowest value
  const minOccurrences = delimiterOptions.reduce<Record<string, number>>(
    (accumulator, delimiter) => {
      accumulator[delimiter.id] = messages.reduce((minCount, message) => {
        const matches = message.match(delimiter.pattern);
        return Math.min(minCount, matches ? matches.length : 0);
      }, Infinity);
      return accumulator;
    },
    {}
  );

  // Find the delimiter with the highest minimum occurrence count
  let bestDelimiter = '\\s'; // Default to whitespace if nothing better found
  let highestMinCount = 0;
  Object.entries(minOccurrences).forEach(([delimiterId, minCount]) => {
    if (minCount > highestMinCount) {
      bestDelimiter = delimiterId;
      highestMinCount = minCount;
    }
  });

  return bestDelimiter;
}
