/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const escapeKqlValue = (v: string): string => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const unescapeKqlValue = (v: string): string => v.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Splits a matcher string on top-level ` AND ` boundaries while respecting
 * quoted strings so that values like `"Dev AND Staging"` are never broken.
 */
const splitOnTopLevelAnd = (matcher: string): string[] => {
  const segments: string[] = [];
  let current = '';
  let inQuotes = false;
  let escaped = false;

  for (let i = 0; i < matcher.length; i++) {
    const ch = matcher[i];

    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      current += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }

    if (!inQuotes) {
      const remaining = matcher.slice(i);
      const andMatch = remaining.match(/^(\s+AND\s+)/i);
      if (andMatch) {
        segments.push(current);
        current = '';
        i += andMatch[1].length - 1;
        continue;
      }
    }

    current += ch;
  }

  if (current) {
    segments.push(current);
  }

  return segments;
};

/**
 * Extracts all quoted values for a given KQL field from a matcher string.
 * Handles both single-value (`field : "v"`) and multi-value OR groups
 * (`(field : "v1" or field : "v2")`).
 */
const parseFieldValues = (matcher: string, fieldName: string): string[] => {
  const escapedField = escapeRegExp(fieldName);
  const quotedRe = new RegExp(`(?<![\\w.])${escapedField}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'gi');
  const unquotedRe = new RegExp(`(?<![\\w.])${escapedField}\\s*:\\s*([^"\\s()][^\\s)"]*)`, 'gi');
  const found = new Set<string>();

  let m: RegExpExecArray | null = quotedRe.exec(matcher);
  while (m !== null) {
    found.add(unescapeKqlValue(m[1]));
    m = quotedRe.exec(matcher);
  }

  m = unquotedRe.exec(matcher);
  while (m !== null) {
    found.add(m[1]);
    m = unquotedRe.exec(matcher);
  }

  return [...found];
};

/**
 * Replaces quoted string contents with empty quotes so that field-name
 * detection only matches structural positions, not values.
 */
const stripQuotedContent = (s: string): string => s.replace(/"(?:[^"\\]|\\.)*"/g, '""');

/**
 * Removes AND-separated segments that reference the given field.
 * Handles both bare clauses and parenthesized OR groups.
 * Uses a quote-aware split so values containing ` AND ` are preserved.
 * Tests against quote-stripped text so field names inside values are ignored.
 */
const stripFieldClauses = (matcher: string, fieldName: string): string => {
  const escapedField = escapeRegExp(fieldName);
  const fieldPattern = new RegExp(`(?<![\\w.])${escapedField}\\s*:`, 'i');

  return splitOnTopLevelAnd(matcher)
    .map((segment) => segment.trim())
    .filter((segment) => {
      if (!segment) return false;
      const unwrapped = segment.replace(/^\(/, '').replace(/\)$/, '');
      return !fieldPattern.test(stripQuotedContent(unwrapped));
    })
    .join(' AND ');
};

/**
 * Builds a KQL clause for a field with the given values.
 * Single value: `field : "v"`
 * Multiple values: `(field : "v1" or field : "v2")`
 * Empty values: returns null.
 */
const buildFieldClause = (fieldName: string, values: readonly string[]): string | null => {
  if (values.length === 0) return null;
  if (values.length === 1) return `${fieldName} : "${escapeKqlValue(values[0])}"`;
  return `(${values.map((v) => `${fieldName} : "${escapeKqlValue(v)}"`).join(' OR ')})`;
};

/**
 * Strips existing clauses for the field and appends a new clause built from
 * the provided values. If values is empty, only strips.
 */
const mergeFieldValues = (
  matcher: string,
  fieldName: string,
  values: readonly string[]
): string => {
  const base = stripFieldClauses(matcher, fieldName).trim();
  const clause = buildFieldClause(fieldName, values);
  if (!clause) return base;
  return base ? `${base} AND ${clause}` : clause;
};

// --- rule.id ---

export const parseRuleIdsFromMatcher = (matcher: string): string[] =>
  parseFieldValues(matcher, 'rule.id');

export const mergeRuleIdsIntoMatcher = (matcher: string, ids: readonly string[]): string =>
  mergeFieldValues(matcher, 'rule.id', ids);

// --- episode_status ---

export const parseEpisodeStatusesFromMatcher = (matcher: string): string[] =>
  parseFieldValues(matcher, 'episode_status');

export const mergeEpisodeStatusIntoMatcher = (
  matcher: string,
  statuses: readonly string[]
): string => mergeFieldValues(matcher, 'episode_status', statuses);

// --- rule.tags ---

export const parseRuleTagsFromMatcher = (matcher: string): string[] =>
  parseFieldValues(matcher, 'rule.tags');

export const mergeRuleTagsIntoMatcher = (matcher: string, tags: readonly string[]): string =>
  mergeFieldValues(matcher, 'rule.tags', tags);
