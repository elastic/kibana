/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateReadOnlyQuery } from './validate_read_only_query';

const ALLOWED = new Set(['processes', 'process_open_sockets', 'users', 'scheduled_tasks']);

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
    expect(validateReadOnlyQuery('SELECT 1; DROP TABLE processes', ALLOWED)).toMatch(
      /forbidden keyword/i
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
      ).toMatch(/forbidden keyword/i);
    });
  });
});
