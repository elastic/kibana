/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const QUOTE_PAIRS = {
  '"': '"',
  "'": "'",
  '`': '`',
};

/**
 * Masks quoted substrings in a given line of text by replacing them with a custom value.
 * Handles single, double, and backtick quotes, respecting escape sequences within the quotes.
 *
 * @param line - The input string to process.
 * @param replaceWith - A function that takes the matched quoted substring and returns the replacement string.
 * @returns The processed string with quoted substrings replaced.
 */
export function maskQuotes(line: string, replaceWith: (match: string) => string): string {
  const out: string[] = [];
  const pairs: Record<string, string> = QUOTE_PAIRS;

  let i = 0;
  let last = 0;

  while (i < line.length) {
    const ch = line[i];

    // Only trigger when we're not already in a mask, and it's an opening delimiter
    if (pairs[ch]) {
      // Flush everything up to the delimiter
      out.push(line.slice(last, i));

      last = i;

      const closer = pairs[ch];
      i++; // move past opener

      // String-style delimiter: honor escaping
      while (i < line.length) {
        if (line[i] === '\\') {
          i += 2; // skip escaped char
        } else if (line[i] === closer) {
          i++; // consume closer
          break;
        } else {
          i++;
        }
      }

      // Insert replacement and update last
      out.push(replaceWith(line.slice(last, i)));
      last = i;
      continue;
    }

    i++;
  }

  // flush any trailing text
  if (last < line.length) {
    out.push(line.slice(last));
  }

  return out.join('');
}
