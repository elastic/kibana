/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateReadOnlyQuery } from './validate_read_only_query';

const ALLOWED = new Set([
  'processes',
  'process_open_sockets',
  'users',
  'scheduled_tasks',
  // These ship in the installed osquery_manager schema catalog, so they pass a
  // catalog-only allowlist — the validator must reject them on its own.
  'curl',
  'curl_certificate',
  'carves',
  'yara',
]);

describe('validateReadOnlyQuery', () => {
  it('accepts a simple SELECT against an allowlisted table', () => {
    expect(validateReadOnlyQuery('SELECT pid, name FROM processes', ALLOWED)).toBeNull();
  });

  it('accepts WITH … SELECT against allowlisted tables', () => {
    expect(
      validateReadOnlyQuery(
        'WITH open AS (SELECT pid FROM process_open_sockets) SELECT * FROM open JOIN processes USING (pid)',
        ALLOWED
      )
    ).toBeNull();
  });

  it('rejects empty query', () => {
    expect(validateReadOnlyQuery('   ', ALLOWED)).toMatch(/empty/i);
  });

  it('rejects non-SELECT statements', () => {
    expect(validateReadOnlyQuery('DELETE FROM processes', ALLOWED)).toMatch(/read-only SELECT/i);
  });

  it('rejects INSERT / UPDATE / ATTACH keywords even inside a SELECT-looking string', () => {
    // Semicolons are rejected first (single-statement rule); keyword scanning
    // still guards single-statement injections like ATTACH via CTE strings.
    expect(validateReadOnlyQuery('SELECT 1; DROP TABLE processes', ALLOWED)).toMatch(
      /single statement|forbidden keyword/i
    );
  });

  it('rejects tables not in the schema catalog', () => {
    expect(validateReadOnlyQuery('SELECT * FROM shell', ALLOWED)).toMatch(
      /not in the Osquery schema catalog/i
    );
  });

  it('is case-insensitive for table names', () => {
    expect(validateReadOnlyQuery('SELECT * FROM Processes', ALLOWED)).toBeNull();
  });

  it('strips comments before validation', () => {
    expect(
      validateReadOnlyQuery('-- comment\nSELECT pid FROM processes /* block */', ALLOWED)
    ).toBeNull();
  });

  describe('comma-separated table lists (review finding 6)', () => {
    it('validates every table in a comma-separated FROM clause, not just the first', () => {
      expect(validateReadOnlyQuery('SELECT * FROM processes, shell', ALLOWED)).toMatch(
        /not in the Osquery schema catalog.*shell/i
      );
    });

    it('accepts a comma-separated list when every table is allowlisted', () => {
      expect(
        validateReadOnlyQuery('SELECT * FROM processes, process_open_sockets', ALLOWED)
      ).toBeNull();
    });

    it('ignores table aliases when validating', () => {
      expect(
        validateReadOnlyQuery('SELECT p.pid FROM processes p, users AS u', ALLOWED)
      ).toBeNull();
    });

    it('validates joined tables after a comma-separated list', () => {
      expect(
        validateReadOnlyQuery('SELECT * FROM processes, users JOIN shell ON 1=1', ALLOWED)
      ).toMatch(/shell/i);
    });
  });

  describe('read-only SQL false positives (review finding 17)', () => {
    it("accepts SQLite's replace() string function", () => {
      expect(
        validateReadOnlyQuery("SELECT replace(path, '\\', '/') FROM processes", ALLOWED)
      ).toBeNull();
    });

    it('accepts a forbidden keyword appearing inside a string literal', () => {
      expect(
        validateReadOnlyQuery("SELECT pid FROM processes WHERE name = 'update.exe'", ALLOWED)
      ).toBeNull();
    });

    it('still rejects REPLACE INTO', () => {
      expect(validateReadOnlyQuery('REPLACE INTO processes VALUES (1)', ALLOWED)).toMatch(
        /read-only SELECT|forbidden keyword/i
      );
    });

    it('still rejects a mutating keyword outside a literal', () => {
      expect(
        validateReadOnlyQuery(
          "SELECT pid FROM processes WHERE name = 'x'; DROP TABLE users",
          ALLOWED
        )
      ).toMatch(/single statement/i);
    });
  });

  describe('non-read-only catalog tables (review finding)', () => {
    it.each([
      ['curl', "SELECT * FROM curl WHERE url = 'http://169.254.169.254/latest/meta-data/'"],
      ['curl_certificate', "SELECT * FROM curl_certificate WHERE hostname = '169.254.169.254'"],
      ['carves', 'SELECT * FROM carves WHERE carve = 1'],
      ['yara', "SELECT * FROM yara WHERE sigrule = 'rule r {}'"],
    ])('rejects catalog table %s because it performs host-side effects', (table, query) => {
      expect(validateReadOnlyQuery(query, ALLOWED)).toMatch(/not read-only/i);
      expect(validateReadOnlyQuery(query, ALLOWED)).toContain(table);
    });

    it('rejects a side-effect table even when joined from a passive table', () => {
      expect(
        validateReadOnlyQuery('SELECT * FROM processes JOIN curl USING (pid)', ALLOWED)
      ).toMatch(/not read-only/i);
    });

    // github-actions review #4956120242 / #4956238504: a table inside a
    // parenthesized subquery must not escape extraction.
    it('rejects a side-effect table hidden in a subquery', () => {
      expect(
        validateReadOnlyQuery(
          "SELECT * FROM processes WHERE pid IN (SELECT 1 FROM curl WHERE url = 'http://169.254.169.254/')",
          ALLOWED
        )
      ).toMatch(/not read-only/i);
    });

    it('rejects a non-catalog table hidden in a subquery (trailing before `)`)', () => {
      expect(
        validateReadOnlyQuery(
          'SELECT 1 FROM processes WHERE pid IN (SELECT pid FROM secret_table)',
          ALLOWED
        )
      ).toMatch(/not in the osquery schema catalog|unknown/i);
    });

    it('rejects a side-effect table in a nested (two-level) subquery', () => {
      expect(
        validateReadOnlyQuery(
          'SELECT * FROM processes WHERE pid IN (SELECT pid FROM process_open_sockets WHERE local_port IN (SELECT port FROM curl))',
          ALLOWED
        )
      ).toMatch(/not read-only/i);
    });

    // github-actions review #4961400745: SQLite needs whitespace only between
    // two bareword tokens, so `JOIN"curl"` / ``JOIN`curl` `` tokenize fine and
    // must not slip past extraction.
    it.each([
      [
        'JOIN + double-quoted table with no whitespace',
        'SELECT * FROM processes JOIN"curl"c ON 1=1',
      ],
      [
        'JOIN + backtick-quoted table with no whitespace',
        'SELECT * FROM processes JOIN`curl`c ON 1=1',
      ],
      [
        'FROM + double-quoted table with no whitespace',
        `SELECT * FROM"curl" WHERE url = 'http://169.254.169.254/'`,
      ],
      ['FROM + backtick-quoted table with no whitespace', 'SELECT * FROM`carves` WHERE carve = 1'],
    ])('rejects a side-effect table when %s', (_desc, query) => {
      expect(validateReadOnlyQuery(query, ALLOWED)).toMatch(/not read-only/i);
    });
  });

  describe('multi-statement rejection (review finding)', () => {
    it('rejects a second statement riding behind a valid first statement', () => {
      expect(
        validateReadOnlyQuery(
          "SELECT * FROM processes; SELECT * FROM curl WHERE url = 'http://internal/'",
          ALLOWED
        )
      ).toMatch(/single statement/i);
    });

    it('rejects a trailing empty statement', () => {
      expect(validateReadOnlyQuery('SELECT pid FROM processes;', ALLOWED)).toMatch(
        /single statement/i
      );
    });

    it('does not reject a semicolon inside a string literal', () => {
      expect(
        validateReadOnlyQuery("SELECT pid FROM processes WHERE cmdline LIKE '%;%'", ALLOWED)
      ).toBeNull();
    });

    it('does not reject a semicolon inside a comment', () => {
      expect(
        validateReadOnlyQuery('SELECT pid FROM processes /* allow; list */', ALLOWED)
      ).toBeNull();
    });
  });

  describe('comment stripping order (review finding #4961701853)', () => {
    it('rejects a side-effect table hidden behind `--` inside a string literal', () => {
      expect(
        validateReadOnlyQuery(
          "SELECT pid FROM processes WHERE name = 'x--' UNION SELECT * FROM curl WHERE url = 'http://169.254.169.254/'",
          ALLOWED
        )
      ).toMatch(/not read-only/i);
    });

    it('handles a block-comment-looking sequence inside a string literal without corrupting the scan', () => {
      // `/* */` is non-greedy and self-contained, so it never truncates the
      // validated view the way `--` (which runs to end-of-line) does. This is a
      // correctness guard, not a bypass regression: the query must still be
      // rejected for the real reason (the `carves` table).
      expect(
        validateReadOnlyQuery(
          "SELECT pid FROM processes WHERE name = 'x/* */' UNION SELECT * FROM carves WHERE carve = 1",
          ALLOWED
        )
      ).toMatch(/not read-only/i);
    });

    it('still strips a genuine trailing line comment', () => {
      expect(
        validateReadOnlyQuery('SELECT pid FROM processes -- ok\nWHERE pid = 1', ALLOWED)
      ).toBeNull();
    });

    it('still strips a genuine block comment', () => {
      expect(
        validateReadOnlyQuery('SELECT pid FROM processes /* note */ WHERE pid = 1', ALLOWED)
      ).toBeNull();
    });
  });

  describe('set-operator clause boundaries', () => {
    it('rejects a denied table behind EXCEPT', () => {
      expect(
        validateReadOnlyQuery(
          "SELECT * FROM processes EXCEPT SELECT * FROM curl WHERE url = 'http://169.254.169.254/'",
          ALLOWED
        )
      ).toMatch(/not read-only/i);
    });

    it('rejects a denied table behind INTERSECT', () => {
      expect(
        validateReadOnlyQuery('SELECT * FROM processes INTERSECT SELECT * FROM carves', ALLOWED)
      ).toMatch(/not read-only/i);
    });

    it('still accepts a benign EXCEPT over allowlisted tables', () => {
      expect(
        validateReadOnlyQuery(
          'SELECT pid FROM processes EXCEPT SELECT pid FROM process_open_sockets',
          ALLOWED
        )
      ).toBeNull();
    });
  });

  describe('bracket quoting', () => {
    it('rejects a denied table in SQLite bracket quotes', () => {
      expect(validateReadOnlyQuery('SELECT * FROM processes, [curl]', ALLOWED)).toMatch(
        /not read-only/i
      );
    });

    it('rejects a denied table in bracket quotes after a JOIN', () => {
      expect(
        validateReadOnlyQuery(
          'SELECT * FROM processes JOIN [yara] ON processes.pid = yara.pid',
          ALLOWED
        )
      ).toMatch(/not read-only/i);
    });
  });

  describe('dotted references resolve to the physical table', () => {
    it('rejects a denied table behind a schema qualifier', () => {
      expect(
        validateReadOnlyQuery(
          'WITH main AS (SELECT pid FROM processes) SELECT * FROM main.curl',
          ALLOWED
        )
      ).toMatch(/not read-only/i);
    });

    it('accepts a dotted reference to an allowlisted physical table', () => {
      expect(validateReadOnlyQuery('SELECT * FROM main.processes', ALLOWED)).toBeNull();
    });
  });

  describe('denylist additions', () => {
    it('rejects prometheus_metrics', () => {
      expect(validateReadOnlyQuery('SELECT * FROM prometheus_metrics', ALLOWED)).toMatch(
        /not read-only/i
      );
    });

    it('rejects wifi_survey', () => {
      expect(validateReadOnlyQuery('SELECT * FROM wifi_survey', ALLOWED)).toMatch(/not read-only/i);
    });
  });

  describe('quoted multi-part references (review round 3)', () => {
    it('rejects a denylisted table reached via "main"."curl"', () => {
      expect(validateReadOnlyQuery('SELECT * FROM "main"."curl"', ALLOWED)).toMatch(
        /not read-only/
      );
    });

    it('rejects a denylisted table reached via [main].[curl]', () => {
      expect(validateReadOnlyQuery('SELECT * FROM [main].[curl]', ALLOWED)).toMatch(
        /not read-only/
      );
    });

    it('rejects a denylisted table reached via `main`.`curl`', () => {
      expect(validateReadOnlyQuery('SELECT * FROM `main`.`curl`', ALLOWED)).toMatch(
        /not read-only/
      );
    });

    it('does not treat a quoted schema prefix as a CTE alias', () => {
      expect(
        validateReadOnlyQuery('WITH main AS (SELECT 1 AS x) SELECT * FROM "main"."curl"', ALLOWED)
      ).toMatch(/not read-only/);
    });

    it('accepts a quoted allowlisted table', () => {
      expect(validateReadOnlyQuery('SELECT * FROM "processes"', ALLOWED)).toBeNull();
    });
  });

  describe('WITH RECURSIVE CTEs (review round 3)', () => {
    it('collects the CTE name after WITH RECURSIVE', () => {
      expect(
        validateReadOnlyQuery(
          'WITH RECURSIVE walk(x) AS (SELECT 1) SELECT * FROM walk JOIN processes ON 1=1',
          ALLOWED
        )
      ).toBeNull();
    });
  });
});
