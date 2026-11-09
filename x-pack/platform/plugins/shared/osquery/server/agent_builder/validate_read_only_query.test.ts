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

  describe('set operators', () => {
    it.each(['EXCEPT', 'INTERSECT'])('scans the right-hand side of %s', (op) => {
      expect(
        validateReadOnlyQuery(`SELECT pid FROM processes ${op} SELECT pid FROM curl`, ALLOWED)
      ).toMatch(/not read-only/i);
    });

    it('allows EXCEPT between allowlisted tables', () => {
      expect(
        validateReadOnlyQuery('SELECT pid FROM processes EXCEPT SELECT uid FROM users', ALLOWED)
      ).toBeNull();
    });
  });

  describe('comment and literal tokenization', () => {
    it('does not treat -- inside a string literal as a comment start', () => {
      expect(
        validateReadOnlyQuery(
          "SELECT pid FROM processes WHERE name = '-- ' UNION SELECT 1 FROM curl WHERE url = 'http://internal/'",
          ALLOWED
        )
      ).toMatch(/not read-only/i);
    });

    it('does not treat /* inside a string literal as a comment start', () => {
      expect(
        validateReadOnlyQuery(
          "SELECT pid FROM processes WHERE name = '/*' UNION SELECT 1 FROM curl WHERE url = '*/'",
          ALLOWED
        )
      ).toMatch(/not read-only/i);
    });

    it('does not let a quote inside a comment swallow real SQL', () => {
      expect(validateReadOnlyQuery("SELECT pid FROM processes -- it's\n, curl", ALLOWED)).toMatch(
        /not read-only/i
      );
    });

    it('handles doubled quotes inside a literal', () => {
      expect(
        validateReadOnlyQuery("SELECT pid FROM processes WHERE name = 'it''s -- ok'", ALLOWED)
      ).toBeNull();
    });
  });

  describe('fail-closed table reference forms', () => {
    it.each([
      ['bracketed identifier', 'SELECT * FROM [curl]'],
      ['bracketed identifier after comma', 'SELECT * FROM processes, [curl]'],
      ['parenthesised reference', 'SELECT * FROM (curl)'],
      ['parenthesised reference after comma', 'SELECT * FROM processes, (curl)'],
      ['parenthesised reference after JOIN', 'SELECT * FROM processes JOIN (curl) ON 1=1'],
      ['table-valued function', "SELECT * FROM curl('http://internal/')"],
      ['table-valued function after JOIN', "SELECT * FROM processes JOIN yara('x') ON 1=1"],
      ['schema-qualified name', 'SELECT * FROM main.curl'],
    ])('rejects %s', (_label, query) => {
      expect(validateReadOnlyQuery(query, ALLOWED)).toMatch(
        /unsupported table reference|not read-only/i
      );
    });

    it.each([
      [
        'alias then comma',
        "SELECT * FROM (SELECT pid FROM processes) AS a, curl WHERE url='http://169.254.169.254/'",
      ],
      ['bare alias then comma', 'SELECT * FROM (SELECT pid FROM processes) a, curl'],
      ['no alias then comma', 'SELECT * FROM (SELECT pid FROM processes), curl'],
      ['sub-select between plain tables', 'SELECT * FROM processes, (SELECT 1), curl'],
      [
        'nested parentheses in sub-select',
        'SELECT * FROM (SELECT count(*) FROM processes) c, curl',
      ],
    ])('rejects a table listed after a sub-select: %s', (_label, query) => {
      expect(validateReadOnlyQuery(query, ALLOWED)).toMatch(/curl/i);
    });

    it.each([
      [
        'sub-select join with ON then comma',
        'SELECT * FROM (SELECT pid FROM processes) a JOIN processes q ON a.pid = q.pid, curl',
      ],
      ['plain join with ON then comma', 'SELECT * FROM processes p JOIN users u ON 1=1, curl'],
      ['USING then comma', 'SELECT * FROM processes JOIN users USING (uid), curl'],
      [
        'ON with function call then comma',
        'SELECT * FROM processes p JOIN users u ON coalesce(p.uid, 0) = u.uid, curl',
      ],
      [
        'comma after a second ON',
        'SELECT * FROM processes a JOIN users b ON 1=1 JOIN users c ON 1=1, curl',
      ],
    ])('rejects a table listed after a join constraint: %s', (_label, query) => {
      expect(validateReadOnlyQuery(query, ALLOWED)).toMatch(/curl/i);
    });

    it('rejects a table named after IN', () => {
      expect(
        validateReadOnlyQuery('SELECT pid FROM processes WHERE name IN curl', ALLOWED)
      ).toMatch(/curl/i);
    });

    it('still accepts commas that are not table lists', () => {
      expect(
        validateReadOnlyQuery(
          'SELECT p.pid, u.uid FROM processes p JOIN users u ON coalesce(p.uid, 0) = u.uid WHERE p.pid IN (1, 2) ORDER BY p.pid, u.uid LIMIT 5, 10',
          ALLOWED
        )
      ).toBeNull();
      expect(
        validateReadOnlyQuery(
          'SELECT * FROM processes JOIN users USING (uid) GROUP BY uid, pid',
          ALLOWED
        )
      ).toBeNull();
    });

    it('validates a deeply nested query in linear time and rejects an oversized one', () => {
      const depth = 2000;
      const nested =
        'SELECT 1 FROM ' + '(SELECT 1 FROM '.repeat(depth) + 'processes' + ')'.repeat(depth);
      const started = Date.now();
      validateReadOnlyQuery(nested, ALLOWED);
      expect(Date.now() - started).toBeLessThan(500);
      expect(validateReadOnlyQuery(nested + ' '.repeat(30000), ALLOWED)).toMatch(/too long/i);
    });

    it('still accepts a sub-select followed by a JOIN, WHERE or ORDER BY', () => {
      expect(
        validateReadOnlyQuery(
          'SELECT p.pid FROM (SELECT pid FROM processes) AS p JOIN processes q ON p.pid = q.pid ORDER BY p.pid',
          ALLOWED
        )
      ).toBeNull();
      expect(
        validateReadOnlyQuery(
          'SELECT * FROM (SELECT pid FROM processes) p WHERE p.pid > 1',
          ALLOWED
        )
      ).toBeNull();
    });

    it('still accepts a parenthesised sub-select over allowlisted tables', () => {
      expect(
        validateReadOnlyQuery('SELECT pid FROM (SELECT pid FROM processes) AS p', ALLOWED)
      ).toBeNull();
    });

    it('checks tables inside a parenthesised sub-select', () => {
      expect(validateReadOnlyQuery('SELECT pid FROM (SELECT pid FROM curl) AS p', ALLOWED)).toMatch(
        /not read-only/i
      );
    });
  });
});
