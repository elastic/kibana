/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';

const unescapeKqlValue = (v: string): string => v.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseTagsFromExpression = (expression: string): string[] => {
  const escapedField = escapeRegExp('rule.tags');
  const quotedRe = new RegExp(`(?<![\\w.])${escapedField}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'gi');
  const unquotedRe = new RegExp(`(?<![\\w.])${escapedField}\\s*:\\s*([^"\\s()][^\\s)"]*)`, 'gi');
  const found = new Set<string>();

  let match: RegExpExecArray | null = quotedRe.exec(expression);
  while (match !== null) {
    found.add(unescapeKqlValue(match[1]));
    match = quotedRe.exec(expression);
  }

  match = unquotedRe.exec(expression);
  while (match !== null) {
    found.add(match[1]);
    match = unquotedRe.exec(expression);
  }

  return [...found];
};

/**
 * Extracts rule-tag values from an action-policy matcher.
 * Prefers structured `matcher.tags`; falls back to parsing `matcher.expression` / legacy string matchers.
 */
export const parseRuleTagsFromMatcher = (
  matcher: PolicyMatcher | string | null | undefined
): string[] => {
  if (matcher == null) {
    return [];
  }
  if (typeof matcher === 'string') {
    return parseTagsFromExpression(matcher);
  }
  if (matcher.tags?.length) {
    return [...matcher.tags];
  }
  if (matcher.expression?.trim()) {
    return parseTagsFromExpression(matcher.expression);
  }
  return [];
};
