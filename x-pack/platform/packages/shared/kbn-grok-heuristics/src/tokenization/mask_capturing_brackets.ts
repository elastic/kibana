/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BRACKET_PAIRS = {
  '[': ']',
  '{': '}',
};

/**
 * Masks content within capturing brackets (e.g., `{}` or `[]`) in a given string.
 * Allows nested brackets and mixed types (e.g., `{[ ]}`).
 * Skips masking for `{` preceded by `%` (e.g., `%{`).
 *
 * @param line - The input string to process.
 * @param replaceWith - A function to generate the replacement for matched content.
 * @returns The processed string with masked content.
 */
export function maskCapturingBrackets(
  line: string,
  replaceWith: (match: string) => string
): string {
  const out: string[] = [];
  const pairs: Record<string, string> = BRACKET_PAIRS;

  let i = 0;
  let last = 0;

  while (i < line.length) {
    const ch = line[i];

    // Only trigger when we're not already in a mask, and it's an opening delimiter
    if (pairs[ch] && !(ch === '{' && line[i - 1] === '%')) {
      // Flush everything up to the delimiter
      out.push(line.slice(last, i));

      last = i;

      const closer = pairs[ch];
      i++; // move past opener
      // Bracket-style: allow nesting of the *same type* and also mixed [ ] & { }
      const stack: string[] = [closer];
      while (i < line.length && stack.length) {
        const c2 = line[i];
        if (pairs[c2]) {
          // another opener (could be [ or {)
          stack.push(pairs[c2]);
        } else if (c2 === stack[stack.length - 1]) {
          // matching closer
          stack.pop();
        }
        i++;
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
