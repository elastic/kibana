/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldNotOneOfCondition, isNotEmptyCondition } from '../domain/definitions/common_fields';
import { LOCAL_NAMESPACE_EXCLUDED_USER_NAMES } from '../domain/definitions/user_entity_constants';
import { entityStoreConditionToESQL } from './condition_to_esql';

describe('entityStoreConditionToESQL', () => {
  describe('homogeneous OR-of-EQ optimization', () => {
    it('rewrites OR-of-EQ to IN when all children are same-field eq', () => {
      const result = entityStoreConditionToESQL({
        or: [
          { field: 'user.name', eq: 'root' },
          { field: 'user.name', eq: 'bin' },
          { field: 'user.name', eq: 'daemon' },
        ],
      });
      expect(result).toBe('TO_STRING(user.name) IN ("root", "bin", "daemon")');
    });

    it('wraps not(or-of-EQ) as NOT (IN)', () => {
      const condition = fieldNotOneOfCondition('user.name', ['root', 'bin']);
      const result = entityStoreConditionToESQL(condition);
      expect(result).toBe('NOT (TO_STRING(user.name) IN ("root", "bin"))');
    });

    it('optimizes the full LOCAL_NAMESPACE_EXCLUDED_USER_NAMES list', () => {
      const condition = fieldNotOneOfCondition('user.name', [
        ...LOCAL_NAMESPACE_EXCLUDED_USER_NAMES,
      ]);
      const result = entityStoreConditionToESQL(condition);
      const names = LOCAL_NAMESPACE_EXCLUDED_USER_NAMES.map((n) => `"${n}"`).join(', ');
      expect(result).toBe(`NOT (TO_STRING(user.name) IN (${names}))`);
      expect(result).not.toContain(' OR ');
    });

    it('finds nested not(or-of-EQ) inside an AND', () => {
      const condition = {
        and: [
          { field: 'user.name', exists: true },
          fieldNotOneOfCondition('user.name', ['root', 'bin']),
        ],
      };
      const result = entityStoreConditionToESQL(condition);
      expect(result).toContain('TO_STRING(user.name) IN (');
      expect(result).toContain(' AND ');
      expect(result).not.toContain(' OR ');
    });
  });

  describe('isNotEmpty condition optimization', () => {
    it('rewrites AND(exists:true, neq:"") on same field to IS NOT NULL AND != ""', () => {
      const result = entityStoreConditionToESQL(isNotEmptyCondition('host.id'));
      expect(result).toBe('TO_STRING(host.id) IS NOT NULL AND TO_STRING(host.id) != ""');
    });

    it('does not optimize AND(exists:true, neq:"") with different fields', () => {
      const condition = {
        and: [
          { field: 'host.id', exists: true },
          { field: 'host.name', neq: '' },
        ],
      };
      // Falls through to general AND handling
      const result = entityStoreConditionToESQL(condition as any);
      expect(result).not.toBe('TO_STRING(host.id) IS NOT NULL AND TO_STRING(host.id) != ""');
    });

    it('optimizes isNotEmpty inside OR (documentsFilter pattern)', () => {
      const condition = {
        or: [
          isNotEmptyCondition('host.id'),
          isNotEmptyCondition('host.name'),
          isNotEmptyCondition('host.hostname'),
        ],
      };
      const result = entityStoreConditionToESQL(condition);
      expect(result).toBe(
        'TO_STRING(host.id) IS NOT NULL AND TO_STRING(host.id) != "" OR ' +
          'TO_STRING(host.name) IS NOT NULL AND TO_STRING(host.name) != "" OR ' +
          'TO_STRING(host.hostname) IS NOT NULL AND TO_STRING(host.hostname) != ""'
      );
    });

    it('optimizes isNotEmpty inside AND + OR (user documentsFilter pattern)', () => {
      const condition = {
        and: [
          {
            or: [
              { field: 'event.outcome', exists: false },
              { field: 'event.outcome', neq: 'failure' },
            ],
          },
          {
            or: [
              isNotEmptyCondition('user.email'),
              isNotEmptyCondition('user.id'),
              isNotEmptyCondition('user.name'),
            ],
          },
        ],
      };
      const result = entityStoreConditionToESQL(condition as any);
      expect(result).toContain('TO_STRING(user.email) IS NOT NULL AND TO_STRING(user.email) != ""');
      expect(result).toContain('TO_STRING(user.id) IS NOT NULL AND TO_STRING(user.id) != ""');
      expect(result).toContain('TO_STRING(user.name) IS NOT NULL AND TO_STRING(user.name) != ""');
      // event.outcome arms use our own leaf emitter — no backtick quoting
      expect(result).not.toContain('NOT(`event.outcome`');
    });
  });

  describe('leaf condition emitter', () => {
    it('renders eq as field == value (default TO_STRING cast)', () => {
      expect(entityStoreConditionToESQL({ field: 'user.name', eq: 'alice' })).toBe(
        'TO_STRING(user.name) == "alice"'
      );
    });

    it('renders neq as field != value (default TO_STRING cast)', () => {
      expect(entityStoreConditionToESQL({ field: 'event.outcome', neq: 'failure' })).toBe(
        'TO_STRING(event.outcome) != "failure"'
      );
    });

    it('renders exists:true as IS NOT NULL (default TO_STRING cast)', () => {
      expect(entityStoreConditionToESQL({ field: 'user.name', exists: true })).toBe(
        'TO_STRING(user.name) IS NOT NULL'
      );
    });

    it('renders exists:false as IS NULL (default TO_STRING cast)', () => {
      expect(entityStoreConditionToESQL({ field: 'user.name', exists: false })).toBe(
        'TO_STRING(user.name) IS NULL'
      );
    });

    it('renders includes as MV_CONTAINS(...) (default TO_STRING cast)', () => {
      expect(entityStoreConditionToESQL({ field: 'event.kind', includes: 'asset' })).toBe(
        'MV_CONTAINS(TO_STRING(event.kind), "asset")'
      );
    });

    it('renders startsWith as STARTS_WITH(...) (default TO_STRING cast)', () => {
      expect(entityStoreConditionToESQL({ field: 'host.name', startsWith: 'web-' })).toBe(
        'STARTS_WITH(TO_STRING(host.name), "web-")'
      );
    });

    it('renders gt/gte/lt/lte comparisons using the declared field type', () => {
      // host.disk.read.bytes is declared as long → TO_LONG cast, not TO_STRING
      expect(entityStoreConditionToESQL({ field: 'host.disk.read.bytes', gt: 5 })).toBe(
        'TO_LONG(host.disk.read.bytes) > 5'
      );
      expect(entityStoreConditionToESQL({ field: 'host.disk.read.bytes', gte: 5 })).toBe(
        'TO_LONG(host.disk.read.bytes) >= 5'
      );
      expect(entityStoreConditionToESQL({ field: 'host.disk.read.bytes', lt: 10 })).toBe(
        'TO_LONG(host.disk.read.bytes) < 10'
      );
      expect(entityStoreConditionToESQL({ field: 'host.disk.read.bytes', lte: 10 })).toBe(
        'TO_LONG(host.disk.read.bytes) <= 10'
      );
    });

    it('renders range as AND-chain using the declared field type', () => {
      // host.disk.read.bytes is declared as long → TO_LONG cast, not TO_STRING
      expect(
        entityStoreConditionToESQL({ field: 'host.disk.read.bytes', range: { gte: 0, lt: 1000 } })
      ).toBe('TO_LONG(host.disk.read.bytes) >= 0 AND TO_LONG(host.disk.read.bytes) < 1000');
    });

    it('renders always as TRUE', () => {
      expect(entityStoreConditionToESQL({ always: {} })).toBe('TRUE');
    });

    it('renders never as FALSE', () => {
      expect(entityStoreConditionToESQL({ never: {} })).toBe('FALSE');
    });
  });

  describe('singleton field type resolution', () => {
    it('casts host.ip to TO_IP (declared ip type)', () => {
      // host.ip is declared with mapping.type = 'ip' in the host entity definition
      expect(entityStoreConditionToESQL({ field: 'host.ip', exists: true })).toBe(
        'TO_IP(host.ip) IS NOT NULL'
      );
    });

    it('casts host.disk.read.bytes to TO_LONG (declared long type)', () => {
      // host.disk.read.bytes is declared with mapping.type = 'long' in the host entity definition
      expect(entityStoreConditionToESQL({ field: 'host.disk.read.bytes', gt: 0 })).toBe(
        'TO_LONG(host.disk.read.bytes) > 0'
      );
    });

    it('defaults to TO_STRING for fields not in any entity definition', () => {
      expect(entityStoreConditionToESQL({ field: 'some.unknown.field', eq: 'value' })).toBe(
        'TO_STRING(some.unknown.field) == "value"'
      );
    });

    it('exempts @timestamp from casting', () => {
      expect(entityStoreConditionToESQL({ field: '@timestamp', exists: true })).toBe(
        '@timestamp IS NOT NULL'
      );
    });
  });

  describe('operator precedence', () => {
    it('wraps non-IN OR in parens when it appears inside AND', () => {
      const condition = {
        and: [
          { field: 'user.name', exists: true },
          {
            or: [
              { field: 'event.kind', eq: 'asset' },
              { field: 'event.kind', eq: 'alert' },
            ],
          },
        ],
      };
      const result = entityStoreConditionToESQL(condition);
      // The OR has two different values but same field → optimized to IN, no parens needed
      expect(result).toContain('TO_STRING(event.kind) IN (');
    });

    it('wraps genuinely non-homogeneous OR in parens inside AND', () => {
      const condition = {
        and: [
          { field: 'user.name', exists: true },
          {
            or: [
              { field: 'event.kind', eq: 'asset' },
              { field: 'event.type', eq: 'creation' }, // different field
            ],
          },
        ],
      };
      const result = entityStoreConditionToESQL(condition);
      // Non-homogeneous OR inside AND must be wrapped in parens
      expect(result).toMatch(/\(.*OR.*\)/);
    });
  });
});
