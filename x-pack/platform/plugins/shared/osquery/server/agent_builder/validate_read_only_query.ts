/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Single-pass SQL tokenizer for validation: comments become a space and the
 * contents of string literals become spaces (length preserved). Quoted
 * identifiers (`"x"`, `` `x` ``, `[x]`) are copied verbatim.
 *
 * Literals and comments must be handled in ONE pass. Stripping comments first
 * lets a `--` or `/*` inside a literal (`name = '-- x'`) truncate the query
 * for validation while the real engine still sees the rest; blanking literals
 * first lets a quote inside a comment swallow real SQL. Keyword and table
 * scanning also must not see inside literals: `WHERE name = 'update.exe'` is
 * read-only, but a raw keyword scan finds UPDATE in the literal.
 */
const sanitizeSql = (sql: string): string => {
  let out = '';
  let i = 0;

  const copyQuoted = (close: string): void => {
    out += sql[i];
    i++;
    while (i < sql.length) {
      out += sql[i];
      if (sql[i] === close) {
        i++;

        return;
      }

      i++;
    }
  };

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      out += ' ';
    } else if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
      out += ' ';
    } else if (ch === "'") {
      out += "'";
      i++;
      while (i < sql.length) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            out += '  ';
            i += 2;
            continue;
          }

          break;
        }

        out += ' ';
        i++;
      }

      if (i < sql.length) {
        out += "'";
        i++;
      }
    } else if (ch === '"' || ch === '`') {
      copyQuoted(ch);
    } else if (ch === '[') {
      copyQuoted(']');
    } else {
      out += ch;
      i++;
    }
  }

  return out;
};

/**
 * Osquery tables that perform host-side effects even inside a syntactically
 * valid SELECT. The schema catalog is an *availability* list, not a
 * *read-only* list: these entries ship in the installed package and pass the
 * catalog check, but must never be reachable through a tool that advertises
 * read-only queries.
 *
 * - `curl`   — performs an outbound HTTP request for every row (SSRF)
 * - `carves` — `carve=1` turns the SELECT into a new carve request (file exfil)
 * - `yara`   — triggers a one-off YARA scan on the host
 */
const NON_READ_ONLY_TABLES = new Set(['curl', 'carves', 'yara']);

interface TableRefs {
  refs: string[];
  /** Set when a FROM/JOIN item has a form this validator cannot check. */
  unsupported: string | null;
}

const SUBQUERY_START = /^\(\s*(?:SELECT|WITH)\b/i;

/**
 * Table references in a FROM/JOIN clause, including comma-separated lists.
 *
 * `FROM processes, shell` is two table references. Matching only the first
 * identifier after FROM validates `processes` and lets `shell` through
 * unchecked.
 *
 * Fails closed: bracketed identifiers (`[curl]`), parenthesised references
 * (`FROM (curl)`), table-valued functions (`FROM curl('…')`) and
 * schema-qualified names are reported as unsupported instead of being skipped.
 * Parenthesised sub-selects are allowed because their own FROM clauses are
 * scanned.
 */
const extractTableRefs = (sql: string): TableRefs => {
  const refs: string[] = [];
  let unsupported: string | null = null;
  const clauseRe =
    /\b(?:FROM|JOIN)\s+([^()]*?)(?=\b(?:WHERE|GROUP|ORDER|LIMIT|HAVING|UNION|EXCEPT|INTERSECT|JOIN|ON|USING)\b|[()]|$)/gi;

  for (const clause of sql.matchAll(clauseRe)) {
    const text = clause[1];
    const rest = sql.slice((clause.index ?? 0) + clause[0].length);

    if (rest.startsWith('(')) {
      const endsWithSeparator = text.trim() === '' || text.trim().endsWith(',');
      if (!endsWithSeparator) {
        unsupported = 'table-valued functions';
      } else if (!SUBQUERY_START.test(rest)) {
        unsupported = 'parenthesised table references';
      }
    }

    for (const item of text.split(',')) {
      const trimmedItem = item.trim();
      if (!trimmedItem) continue;
      // First identifier of each item; drops any alias (`processes p`,
      // `processes AS p`) and optional backtick/double quoting.
      const match = trimmedItem.match(/^[`"]?([a-zA-Z_][a-zA-Z0-9_]*)[`"]?(?![.\w])/);
      if (match) {
        refs.push(match[1].toLowerCase());
      } else {
        unsupported = unsupported ?? 'bracketed or schema-qualified table names';
      }
    }
  }

  return { refs, unsupported };
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

  const scannable = sanitizeSql(trimmed).trim();

  // A semicolon anywhere outside a string literal means a second statement.
  // extractTableRefs stops at the first statement's keywords, so
  // `SELECT * FROM processes; SELECT * FROM curl …` would validate only
  // `processes` and let the second statement reach osquery unchecked.
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

  // CTE aliases (WITH name AS (...)) are not physical tables — allow them
  const cteAliases = new Set(
    [...scannable.matchAll(/\b(?:WITH|,)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(/gi)].map((m) =>
      m[1].toLowerCase()
    )
  );

  const { refs: tableRefs, unsupported } = extractTableRefs(scannable);

  if (unsupported) {
    return `Unsupported table reference form (${unsupported}). Reference Osquery tables by plain name in FROM / JOIN.`;
  }

  if (tableRefs.length === 0) {
    return 'Query must reference at least one Osquery table via FROM / JOIN';
  }

  const nonReadOnly = [...new Set(tableRefs)].filter((t) => NON_READ_ONLY_TABLES.has(t));
  if (nonReadOnly.length > 0) {
    return `Table(s) are not read-only and cannot be used in a live query: ${nonReadOnly.join(
      ', '
    )}. These tables perform host-side actions (HTTP requests, file carving, YARA scans) even in a SELECT.`;
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
