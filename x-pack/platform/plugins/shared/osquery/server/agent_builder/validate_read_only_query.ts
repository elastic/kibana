/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Replaces the contents of SQL string literals with spaces, preserving length.
 *
 * Keyword and table scanning must not see inside literals: a query such as
 * `SELECT * FROM processes WHERE name = 'update.exe'` is read-only, but a raw
 * keyword scan finds UPDATE in the literal and rejects it.
 */
const blankStringLiterals = (sql: string): string =>
  sql.replace(/'(?:[^']|'')*'/g, (match) => `'${' '.repeat(Math.max(match.length - 2, 0))}'`);

/**
 * Table references in a FROM/JOIN clause, including comma-separated lists.
 *
 * `FROM processes, shell` is two table references. Matching only the first
 * identifier after FROM validates `processes` and lets `shell` through
 * unchecked.
 */
const extractTableRefs = (sql: string): string[] => {
  const refs: string[] = [];
  const clauseRe =
    /\b(?:FROM|JOIN)\s+([^()]*?)(?=\b(?:WHERE|GROUP|ORDER|LIMIT|HAVING|UNION|JOIN|ON|USING)\b|$)/gi;

  for (const clause of sql.matchAll(clauseRe)) {
    for (const item of clause[1].split(',')) {
      // First identifier of each item; drops any alias (`processes p`,
      // `processes AS p`) and optional backtick/double quoting.
      const match = item.trim().match(/^[`"]?([a-zA-Z_][a-zA-Z0-9_]*)[`"]?/);
      if (match) {
        refs.push(match[1].toLowerCase());
      }
    }
  }

  return refs;
};

/**
 * Validates that an Osquery SQL query is read-only and only references tables
 * present in the SchemaService catalog (the extensible allowlist).
 *
 * Rejects:
 * - Non-SELECT statements (INSERT/UPDATE/DELETE/ATTACH/etc.)
 * - Tables not present in the installed osquery schema catalog
 *
 * Returns null when valid, or an error message string when invalid.
 */
export const validateReadOnlyQuery = (
  query: string,
  allowedTables: ReadonlySet<string>
): string | null => {
  const trimmed = query.trim();
  if (!trimmed) {
    return 'Query must not be empty';
  }

  // Strip single-line and block comments before keyword checks
  const withoutComments = trimmed
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .trim();

  const scannable = blankStringLiterals(withoutComments);

  // Osquery live queries must be a single SELECT (optionally WITH … SELECT)
  if (!/^(WITH\b[\s\S]+?\bSELECT\b|SELECT\b)/i.test(scannable)) {
    return 'Only read-only SELECT queries are allowed. Mutating statements (INSERT, UPDATE, DELETE, ATTACH, etc.) are rejected.';
  }

  // Reject mutating / dangerous keywords used as statements. REPLACE is
  // excluded here because SQLite's replace() is a read-only string function;
  // `REPLACE INTO` is caught by the INTO form below.
  const forbidden =
    /\b(INSERT|UPDATE|DELETE|ATTACH|DETACH|DROP|CREATE|ALTER|PRAGMA|VACUUM|REINDEX)\b(?!\s*\()/i;
  if (forbidden.test(scannable)) {
    return 'Query contains a forbidden keyword. Only read-only SELECT queries against schema-catalog tables are allowed.';
  }

  if (/\bREPLACE\s+INTO\b/i.test(scannable) || /\bINTO\s+[a-zA-Z_`"]/i.test(scannable)) {
    return 'Query contains a forbidden keyword. Only read-only SELECT queries against schema-catalog tables are allowed.';
  }

  // CTE aliases (WITH name AS (...)) are not physical tables — allow them
  const cteAliases = new Set(
    [...scannable.matchAll(/\b(?:WITH|,)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(/gi)].map((m) =>
      m[1].toLowerCase()
    )
  );

  const tableRefs = extractTableRefs(scannable);

  if (tableRefs.length === 0) {
    return 'Query must reference at least one Osquery table via FROM / JOIN';
  }

  const unknown = [...new Set(tableRefs)].filter(
    (t) => !allowedTables.has(t) && !cteAliases.has(t)
  );
  if (unknown.length > 0) {
    return `Table(s) not in the Osquery schema catalog (allowlist): ${unknown.join(
      ', '
    )}. Call osquery.get_table_schema to inspect available tables.`;
  }

  return null;
};
