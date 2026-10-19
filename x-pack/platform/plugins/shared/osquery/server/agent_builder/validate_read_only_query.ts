/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Blanks SQL literals and comments in one pass so their delimiters cannot interact. */
const blankLiteralsAndComments = (sql: string): string => {
  let state: 'sql' | 'literal' | 'line' | 'block' | 'identifier' = 'sql';
  let identifierEnd = '';
  let result = '';
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];
    if (state === 'literal') {
      result += ' ';
      if (char === "'") {
        if (next === "'") {
          result += ' ';
          i++;
        } else {
          state = 'sql';
        }
      }
    } else if (state === 'identifier') {
      result += char;
      if (char === identifierEnd) {
        if (identifierEnd !== ']' && next === identifierEnd) {
          result += next;
          i++;
        } else {
          state = 'sql';
        }
      }
    } else if (state === 'line') {
      result += char === '\n' || char === '\r' ? char : ' ';
      if (char === '\n' || char === '\r') state = 'sql';
    } else if (state === 'block') {
      result += ' ';
      if (char === '*' && next === '/') {
        result += ' ';
        i++;
        state = 'sql';
      }
    } else if (char === '"' || char === '`' || char === '[') {
      result += char;
      identifierEnd = char === '[' ? ']' : char;
      state = 'identifier';
    } else if (char === "'") {
      result += ' ';
      state = 'literal';
    } else if ((char === '-' && next === '-') || (char === '/' && next === '*')) {
      result += '  ';
      i++;
      state = char === '-' ? 'line' : 'block';
    } else {
      result += char;
    }
  }

  return result;
};

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

const TOKEN_RE =
  /\s+|"(?:[^"]|"")*"|`(?:[^`]|``)*`|\[[^\]]*\]|[A-Za-z_][A-Za-z0-9_$]*|\d[\w.]*|[\s\S]/g;
const IDENTIFIER_RE = /^(?:[A-Za-z_]|["`[])/;
/** Keywords that end the table list of the SELECT they appear in. */
const FROM_LIST_TERMINATORS = new Set([
  'WHERE',
  'GROUP',
  'ORDER',
  'LIMIT',
  'HAVING',
  'WINDOW',
  'UNION',
  'EXCEPT',
  'INTERSECT',
  'SELECT',
]);
const SUBQUERY_STARTS = new Set(['SELECT', 'WITH', 'VALUES']);

interface Scope {
  /** Between FROM/JOIN and the clause that ends the table list. */
  inFromList: boolean;
  /** The next token begins a table-or-subquery. */
  expectTable: boolean;
}

interface TableRefExtraction {
  refs: string[];
  /** Set when the FROM clause has a shape this scanner cannot inspect. */
  unsupported?: string;
}

const unquoteIdentifier = (token: string): string =>
  token.replace(/^[`"[]/, '').replace(/[`"\]]$/, '');

/**
 * Table references in every FROM/JOIN clause, at every parenthesis depth.
 *
 * The scan is a token walk with one scope per parenthesis level, because the
 * table list of a SELECT is not contiguous text: `FROM a JOIN b ON x, c`,
 * `FROM (SELECT 1 FROM a), c` and `FROM a JOIN b USING (id), c` all name `c`
 * after the point where a flat clause regex has stopped looking. A reference
 * the scan never sees escapes both the catalog allowlist and
 * NON_READ_ONLY_TABLES.
 *
 * A parenthesized table factor that is not a subquery — `JOIN (curl AS c)`,
 * `FROM ((curl))` — is valid SQLite and names a table through the parentheses,
 * so it is reported as `unsupported` and rejected rather than guessed at.
 */
const extractTableRefs = (sql: string): TableRefExtraction => {
  const tokens = (sql.match(TOKEN_RE) ?? []).filter((token) => token.trim() !== '');
  const refs: string[] = [];
  const scopes: Scope[] = [{ inFromList: false, expectTable: false }];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const word = token.toUpperCase();
    const scope = scopes[scopes.length - 1];

    if (token === '(') {
      if (scope.expectTable) {
        let next = i;
        while (tokens[next] === '(') next++;
        if (!SUBQUERY_STARTS.has((tokens[next] ?? '').toUpperCase())) {
          return {
            refs,
            unsupported:
              'Parenthesized table references other than subqueries are not supported. Name each table directly after FROM / JOIN.',
          };
        }
      }

      scope.expectTable = false;
      scopes.push({ inFromList: false, expectTable: false });
    } else if (token === ')') {
      if (scopes.length === 1) {
        return { refs, unsupported: 'Query has unbalanced parentheses.' };
      }

      scopes.pop();
    } else if (token === ',') {
      if (scope.inFromList) scope.expectTable = true;
    } else if (word === 'FROM' && (tokens[i - 1] ?? '').toUpperCase() === 'DISTINCT') {
      // `a IS DISTINCT FROM b` is a comparison, not a table list.
    } else if (word === 'FROM' || word === 'JOIN') {
      scope.inFromList = true;
      scope.expectTable = true;
    } else if (FROM_LIST_TERMINATORS.has(word)) {
      scope.inFromList = false;
      scope.expectTable = false;
    } else if (word === 'ON' || word === 'USING') {
      scope.expectTable = false;
    } else if (scope.expectTable && IDENTIFIER_RE.test(token)) {
      // Dot-separated chain, each segment independently quoted
      // (`main`.`curl`, [main].[curl], "main".curl). `physicalTableName`
      // resolves the last segment.
      const segments = [unquoteIdentifier(token)];
      while (tokens[i + 1] === '.' && IDENTIFIER_RE.test(tokens[i + 2] ?? '')) {
        segments.push(unquoteIdentifier(tokens[i + 2]));
        i += 2;
      }

      refs.push(segments.join('.').toLowerCase());
      scope.expectTable = false;
    }
  }

  return scopes.length > 1 ? { refs, unsupported: 'Query has unbalanced parentheses.' } : { refs };
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
 * A reference with no schema qualifier (`processes`), as opposed to a qualified
 * one (`main.processes`).
 */
const isUnqualifiedRef = (ref: string): boolean => !ref.includes('.');

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

  const scannable = blankLiteralsAndComments(trimmed).trim();

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

  const { refs: tableRefs, unsupported } = extractTableRefs(scannable);
  if (unsupported) {
    return unsupported;
  }

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

  // The CTE exemption applies to UNQUALIFIED references only: SQLite resolves a
  // qualified name (`main.sqlite_master`) to the physical table and never to a
  // CTE, so exempting it because its last segment matches a CTE alias would let
  // a catalog-omitted physical table reach dispatch (github-actions #4975398841).
  const unknown = [
    ...new Set(
      tableRefs
        .filter(
          (ref) =>
            !allowedTables.has(physicalTableName(ref)) &&
            !(isUnqualifiedRef(ref) && cteAliases.has(ref.toLowerCase()))
        )
        .map(physicalTableName)
    ),
  ];
  if (unknown.length > 0) {
    return `Table(s) not in the Osquery schema catalog (allowlist): ${unknown.join(
      ', '
    )}. Call osquery.get_table_schema to inspect available tables.`;
  }

  return null;
};
