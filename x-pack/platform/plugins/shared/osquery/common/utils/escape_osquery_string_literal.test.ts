/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeOsqueryStringLiteral } from './escape_osquery_string_literal';

describe('escapeOsqueryStringLiteral', () => {
  describe('when escaping plain values', () => {
    it('should wrap a plain path in single quotes', () => {
      expect(escapeOsqueryStringLiteral('/etc')).toBe("'/etc'");
    });

    it('should preserve unicode and space characters', () => {
      expect(escapeOsqueryStringLiteral('/Users/José/My Documents')).toBe(
        "'/Users/José/My Documents'"
      );
      expect(escapeOsqueryStringLiteral('C:\\Program Files\\日本語')).toBe(
        "'C:\\Program Files\\日本語'"
      );
    });

    it('should preserve SQL wildcard characters literally (% and _ are not special inside a literal)', () => {
      expect(escapeOsqueryStringLiteral('/var/log/%')).toBe("'/var/log/%'");
      expect(escapeOsqueryStringLiteral('/var/log/_internal')).toBe("'/var/log/_internal'");
    });

    it('should handle an empty string', () => {
      expect(escapeOsqueryStringLiteral('')).toBe("''");
    });
  });

  describe('when escaping values containing single quotes', () => {
    it('should double a single embedded quote', () => {
      expect(escapeOsqueryStringLiteral("/etc/o'reilly")).toBe("'/etc/o''reilly'");
    });

    it('should double every quote in a value with multiple quotes', () => {
      expect(escapeOsqueryStringLiteral("a'b'c")).toBe("'a''b''c'");
    });

    it('should handle a value that is only a single quote', () => {
      expect(escapeOsqueryStringLiteral("'")).toBe("''''");
    });
  });

  describe('when neutralizing injection attempts', () => {
    it('should neutralize a classic statement-terminating injection', () => {
      const escaped = escapeOsqueryStringLiteral("'; DROP TABLE file; --");
      // The leading quote is doubled, so it can no longer terminate the literal.
      expect(escaped).toBe("'''; DROP TABLE file; --'");
      // Still a single, balanced literal: even number of unescaped quote boundaries.
      expect(escaped.startsWith("'")).toBe(true);
      expect(escaped.endsWith("'")).toBe(true);
    });

    it('should neutralize a boolean-based injection', () => {
      expect(escapeOsqueryStringLiteral("' OR '1'='1")).toBe("''' OR ''1''=''1'");
    });

    it('should keep the injected payload inert inside a WHERE clause', () => {
      const path = "/tmp'; DELETE FROM file WHERE '1'='1";
      const clause = `WHERE directory = ${escapeOsqueryStringLiteral(path)}`;
      expect(clause).toBe("WHERE directory = '/tmp''; DELETE FROM file WHERE ''1''=''1'");
    });
  });
});
