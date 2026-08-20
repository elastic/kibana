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
 * Osquery tables whose SELECT performs host-side effects. The schema catalog
 * is an availability list, not a read-only list — these entries pass the
 * catalog check but must never be reachable here.
 *
 * These perform host-side network, radio, file-carving or scanning work even
 * inside a SELECT.
 */
const NON_READ_ONLY_TABLES = new Set([
  'curl',
  'curl_certificate',
  'carves',
  'yara',
  'prometheus_metrics',
  'wifi_survey',
]);

/**
 * Table references in a FROM/JOIN clause, including comma-separated lists and
 * parenthesized subqueries.
 *
 * `FROM processes, shell` is two table references. Matching only the first
 * identifier after FROM validates `processes` and lets `shell` through
 * unchecked. A table nested in a subquery — `WHERE pid IN (SELECT 1 FROM curl
 * WHERE ...)` — must also be extracted, or it escapes both the catalog
 * allowlist and NON_READ_ONLY_TABLES.
 *
 * Set operators (UNION / EXCEPT / INTERSECT) terminate a clause like WHERE
 * does, so each branch's tables are extracted.
 */
const extractTableRefs = (sql: string): string[] => {
  const refs: string[] = [];
  // The capture stops at the next clause keyword OR at a paren boundary, but
  // the lookahead consumes nothing — so the global match resumes inside the
  // parenthesized group and finds FROM/JOIN at every nesting level. Without
  // the `[()]` boundary a table immediately before `)` is dropped entirely.
  const clauseRe =
    /\b(?:FROM|JOIN)(?:\s+|(?=[`"[]))([^()]*?)(?=\b(?:WHERE|GROUP|ORDER|LIMIT|HAVING|UNION|EXCEPT|INTERSECT|JOIN|ON|USING)\b|[()]|$)/gi;

  for (const clause of sql.matchAll(clauseRe)) {
    for (const item of clause[1].split(',')) {
      // First reference of each item; drops any alias (`processes p`,
      // `processes AS p`). A reference is a chain of dot-separated segments
      // where each segment may be quoted independently (`main`.`curl`,
      // [main].[curl], "main".curl) — one optional quote wrapper per segment,
      // not per reference. `physicalTableName` resolves the last segment.
      const quotedSegment =
        '((?:[`"\\[])[a-zA-Z_][a-zA-Z0-9_]*(?:[`"\\]])?|[a-zA-Z_][a-zA-Z0-9_]*)';
      const match = item
        .trim()
        .match(new RegExp(`^(${quotedSegment}(?:\\s*\\.\\s*${quotedSegment})*)`));
      if (match) {
        refs.push(
          match[1]
            .split('.')
            .map((segment) => segment.trim().replace(/^[\s`"[]+|[\s`"\]]+$/g, ''))
            .filter(Boolean)
            .join('.')
            .toLowerCase()
        );
      }
    }
  }

  return refs;
};

/**
 * The physical table name of a (possibly qualified) reference: SQLite resolves
 * the last dot-segment, so `main.curl` is the `curl` table, not a CTE `main`.
 */
const physicalTableName = (ref: string): string => {
  const segments = ref.split('.');

  return segments[segments.length - 1].toLowerCase();
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

  // Blank string literals FIRST, then strip comments. The order is
  // load-bearing (github-actions #4961701853): a `--` or `/* */` *inside* a
  // string literal is not a comment — e.g. `name = 'x--'`. Stripping comments
  // from the raw query would delete everything after that `--`, so the
  // validator would scan only the truncated prefix while `run_live_query`
  // dispatches the ORIGINAL query — bypassing the table allowlist.
  const withoutLiterals = blankStringLiterals(trimmed);

  // Strip single-line and block comments before keyword checks
  const scannable = withoutLiterals
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .trim();

  // extractTableRefs only scans the first statement's clause keywords.
  if (scannable.includes(';')) {
    return 'Query must be a single statement. Multiple statements separated by semicolons are not allowed.';
  }

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

  // CTE aliases (WITH [RECURSIVE] name[(cols)] AS (...)) are not physical tables — allow them
  const cteAliases = new Set(
    [
      ...scannable.matchAll(
        /\b(?:WITH|,)\s+(?:RECURSIVE\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\([^()]*\))?\s+AS\s*\(/gi
      ),
    ].map((m) => m[1].toLowerCase())
  );

  const tableRefs = extractTableRefs(scannable);

  if (tableRefs.length === 0) {
    return 'Query must reference at least one Osquery table via FROM / JOIN';
  }

  const physicalRefs = tableRefs.map(physicalTableName);

  const nonReadOnly = [...new Set(physicalRefs)].filter((t) => NON_READ_ONLY_TABLES.has(t));
  if (nonReadOnly.length > 0) {
    return `Table(s) are not read-only and cannot be used in a live query: ${nonReadOnly.join(
      ', '
    )}. These tables perform host-side actions (HTTP requests, file carving, YARA scans, network or radio side effects) even in a SELECT.`;
  }

  const unknown = [...new Set(physicalRefs)].filter(
    (t) => !allowedTables.has(t) && !cteAliases.has(t)
  );
  if (unknown.length > 0) {
    return `Table(s) not in the Osquery schema catalog (allowlist): ${unknown.join(
      ', '
    )}. Call osquery.get_table_schema to inspect available tables.`;
  }

  return null;
};
