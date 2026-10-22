/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Some built-in rules need context a pattern cannot express: patterns here must run on both
 * native `RegExp` and RE2, and RE2 has no lookbehind. A filter sees the full text and the span a
 * rule matched, and returns `false` to drop that match. Filters apply to built-in rules only;
 * custom rules are never filtered.
 */
const FILTERS: Record<string, (text: string, start: number, end: number) => boolean> = {
  // `WINDOWS\System32` inside `C:\WINDOWS\System32` or `/usr/SHARE/x` is a path segment, not an
  // account: a real `DOMAIN\account` is not glued to another path component.
  'builtin-account-login': (text, start) => {
    const before = text[start - 1];
    return before !== '\\' && before !== '/';
  },
};

/** Returns `false` when the built-in rule `ruleId` should ignore the match at `[start, end)`. */
export const shouldKeepBuiltInMatch = (
  ruleId: string | undefined,
  text: string,
  start: number,
  end: number
): boolean => (ruleId === undefined ? true : FILTERS[ruleId]?.(text, start, end) ?? true);
