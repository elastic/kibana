/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RE2JS } from 're2js';

/**
 * Structurally matches `ConfigType['audit']['ignore_filters'][number]`.
 */
export interface AuditIgnoreFilter {
  actions?: string[];
  categories?: string[];
  outcomes?: string[];
  spaces?: string[];
  types?: string[];
  users?: string[];
}

export type UserMatcher = (username: string) => boolean;

/**
 * An ignore filter with the `users` entries precompiled into a matcher function.
 */
export interface CompiledAuditIgnoreFilter extends Omit<AuditIgnoreFilter, 'users'> {
  users?: UserMatcher;
}

export type ParsedUsersFilterEntry =
  | { type: 'literal'; value: string }
  | { type: 'regex'; pattern: string; negated: boolean };

/**
 * Parses a single `users` ignore filter entry. Entries wrapped in slashes (`/pattern/`) are
 * regular expressions and entries prefixed with an exclamation mark (`!/pattern/`) are negated
 * regular expressions; anything else is an exact-match literal.
 */
export function parseUsersFilterEntry(entry: string): ParsedUsersFilterEntry {
  if (entry.startsWith('!/') && entry.endsWith('/') && entry.length >= 3) {
    return { type: 'regex', pattern: entry.slice(2, -1), negated: true };
  }
  if (entry.startsWith('/') && entry.endsWith('/') && entry.length >= 2) {
    return { type: 'regex', pattern: entry.slice(1, -1), negated: false };
  }
  return { type: 'literal', value: entry };
}

/**
 * Compiles `users` ignore filter entries into a single matcher. The matcher returns `true` if any
 * literal entry equals the username, any regex entry matches it, or any negated regex entry does
 * not match it. Regular expressions are compiled once here, using RE2 to guarantee linear-time
 * matching, and are unanchored: patterns match anywhere within the username unless anchored with
 * `^` and `$`. Throws if an entry contains an invalid pattern.
 */
export function compileUsersFilter(users: string[]): UserMatcher {
  const literals = new Set<string>();
  const patterns: Array<{ re: RE2JS; negated: boolean }> = [];

  for (const entry of users) {
    const parsed = parseUsersFilterEntry(entry);
    if (parsed.type === 'literal') {
      literals.add(parsed.value);
    } else {
      patterns.push({ re: RE2JS.compile(parsed.pattern), negated: parsed.negated });
    }
  }

  if (patterns.length === 0) {
    return (username) => literals.has(username);
  }
  return (username) =>
    literals.has(username) || patterns.some(({ re, negated }) => re.test(username) !== negated);
}

/**
 * Validates that every regex entry compiles; intended for use as a `schema.arrayOf` validator.
 */
export function validateUsersFilter(users: readonly string[]): string | undefined {
  const errors = users.flatMap((entry, index) => {
    const parsed = parseUsersFilterEntry(entry);
    if (parsed.type === 'literal') {
      return [];
    }
    try {
      RE2JS.compile(parsed.pattern);
      return [];
    } catch (error) {
      return [`"${error.message}" at array position ${index}`];
    }
  });
  return errors.length !== 0 ? errors.join('. ') : undefined;
}

/**
 * Compiles the `users` entries of each ignore filter once so that per-event filtering never
 * parses or compiles patterns.
 */
export function compileAuditIgnoreFilters(
  filters: AuditIgnoreFilter[] | undefined
): CompiledAuditIgnoreFilter[] | undefined {
  return filters?.map(({ users, ...rest }) => ({
    ...rest,
    ...(users && { users: compileUsersFilter(users) }),
  }));
}
