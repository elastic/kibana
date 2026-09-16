/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const unescapeKqlValue = (v: string): string => v.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Extracts `rule.tags` values from an action-policy matcher.
 * Linking a policy means adding these tags to the rule (OR match).
 */
export const parseRuleTagsFromMatcher = (matcher: string | null | undefined): string[] => {
  if (!matcher?.trim()) {
    return [];
  }

  const escapedField = escapeRegExp('rule.tags');
  const quotedRe = new RegExp(`(?<![\\w.])${escapedField}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'gi');
  const unquotedRe = new RegExp(`(?<![\\w.])${escapedField}\\s*:\\s*([^"\\s()][^\\s)"]*)`, 'gi');
  const found = new Set<string>();

  let match: RegExpExecArray | null = quotedRe.exec(matcher);
  while (match !== null) {
    found.add(unescapeKqlValue(match[1]));
    match = quotedRe.exec(matcher);
  }

  match = unquotedRe.exec(matcher);
  while (match !== null) {
    found.add(match[1]);
    match = unquotedRe.exec(matcher);
  }

  return [...found];
};
