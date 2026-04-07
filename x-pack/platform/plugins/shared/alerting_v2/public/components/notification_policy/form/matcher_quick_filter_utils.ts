/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Extracts all quoted values for a given KQL field from a matcher string.
 * Handles both single-value (`field : "v"`) and multi-value OR groups
 * (`(field : "v1" or field : "v2")`).
 */
const parseFieldValues = (matcher: string, fieldName: string): string[] => {
  const escaped = fieldName.replace(/\./g, '\\.');
  const re = new RegExp(`${escaped}\\s*:\\s*"([^"]*)"`, 'gi');
  const found = new Set<string>();
  let m: RegExpExecArray | null = re.exec(matcher);
  while (m !== null) {
    found.add(m[1]);
    m = re.exec(matcher);
  }
  return [...found];
};

/**
 * Removes AND-separated segments that reference the given field.
 * Handles both bare clauses and parenthesized OR groups.
 */
const stripFieldClauses = (matcher: string, fieldName: string): string => {
  const escaped = fieldName.replace(/\./g, '\\.');
  const fieldPattern = new RegExp(`${escaped}\\s*:`, 'i');

  return matcher
    .split(/\s+AND\s+/i)
    .map((segment) => segment.trim())
    .filter((segment) => {
      if (!segment) return false;
      // Remove segments that contain the target field
      // Strip outer parens for inspection so we catch `(field : "a" or field : "b")`
      const unwrapped = segment.replace(/^\(/, '').replace(/\)$/, '');
      return !fieldPattern.test(unwrapped);
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
  if (values.length === 1) return `${fieldName} : "${values[0]}"`;
  return `(${values.map((v) => `${fieldName} : "${v}"`).join(' or ')})`;
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
