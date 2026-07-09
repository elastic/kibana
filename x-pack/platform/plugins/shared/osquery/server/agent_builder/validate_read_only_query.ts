/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  // Osquery live queries must be a single SELECT (optionally WITH … SELECT)
  if (!/^(WITH\b[\s\S]+?\bSELECT\b|SELECT\b)/i.test(withoutComments)) {
    return 'Only read-only SELECT queries are allowed. Mutating statements (INSERT, UPDATE, DELETE, ATTACH, etc.) are rejected.';
  }

  // Reject common mutating / dangerous keywords anywhere in the statement
  const forbidden =
    /\b(INSERT|UPDATE|DELETE|ATTACH|DETACH|DROP|CREATE|ALTER|REPLACE|PRAGMA|VACUUM|REINDEX)\b/i;
  if (forbidden.test(withoutComments)) {
    return 'Query contains a forbidden keyword. Only read-only SELECT queries against schema-catalog tables are allowed.';
  }

  // CTE aliases (WITH name AS (...)) are not physical tables — allow them
  const cteAliases = new Set(
    [...withoutComments.matchAll(/\b(?:WITH|,)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(/gi)].map((m) =>
      m[1].toLowerCase()
    )
  );

  // Extract table names from FROM / JOIN clauses (simple identifier or `quoted`)
  const tableRefs = [
    ...withoutComments.matchAll(/\b(?:FROM|JOIN)\s+([`"]?)([a-zA-Z_][a-zA-Z0-9_]*)\1/gi),
  ].map((m) => m[2].toLowerCase());

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
