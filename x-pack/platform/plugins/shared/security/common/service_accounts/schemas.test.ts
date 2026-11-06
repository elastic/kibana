/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ES_SERVICE_ACCOUNT_NAME_MAX_LENGTH,
  SERVICE_ACCOUNT_DESCRIPTION_MAX_LENGTH,
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  UIAM_SERVICE_ACCOUNT_NAME_MAX_LENGTH,
} from './constants';
import {
  esServiceAccountNameSchema,
  getServiceAccountRolesSchema,
  serviceAccountDescriptionSchema,
  serviceAccountIdSchema,
  uiamServiceAccountNameSchema,
} from './schemas';

describe('service account schemas', () => {
  it.each([
    [serviceAccountIdSchema, SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH],
    [esServiceAccountNameSchema, ES_SERVICE_ACCOUNT_NAME_MAX_LENGTH],
    [uiamServiceAccountNameSchema, UIAM_SERVICE_ACCOUNT_NAME_MAX_LENGTH],
  ] as const)('enforces the string length boundary', (schema, maxLength) => {
    expect(schema.safeParse('a'.repeat(maxLength)).success).toBe(true);
    expect(schema.safeParse('a'.repeat(maxLength + 1)).success).toBe(false);
    expect(schema.safeParse(123).success).toBe(false);
  });

  describe('esServiceAccountNameSchema', () => {
    it.each(['a', 'A', '0', 'nightshift-relay', 'nightshift_relay', 'relay-1_2'])(
      'accepts %s',
      (name) => {
        expect(esServiceAccountNameSchema.safeParse(name).success).toBe(true);
      }
    );

    // The name is interpolated into an Elasticsearch URL path, so the charset rule is what keeps
    // a traversal or a query separator from reaching the transport layer. The trailing newline
    // pins JavaScript's `$` to the true end of input: it would pass if the regex ever grew an
    // `m` flag.
    it.each([
      '',
      'nightshift-relay\n',
      '_leading',
      '-leading',
      'with space',
      '../_cluster/settings',
      'with/slash',
      'with?query',
      'with#fragment',
      'with.dot',
      'emoji-🙂',
    ])('rejects %s', (name) => {
      expect(esServiceAccountNameSchema.safeParse(name).success).toBe(false);
    });
  });

  describe('uiamServiceAccountNameSchema', () => {
    it.each([
      'nightshift-relay',
      'Nightshift relay',
      'name.with.dots',
      '../_cluster/settings',
      'Ünïcödé 名前 🙂',
    ])('accepts %s', (name) => {
      expect(uiamServiceAccountNameSchema.parse(name)).toBe(name);
    });

    it('trims surrounding whitespace', () => {
      expect(uiamServiceAccountNameSchema.parse('  Nightshift relay  ')).toBe('Nightshift relay');
    });

    // UIAM counts UTF-16 code units, so an emoji counts twice.
    it('counts UTF-16 code units', () => {
      const emoji = '🙂';
      expect(
        uiamServiceAccountNameSchema.safeParse(
          emoji.repeat(UIAM_SERVICE_ACCOUNT_NAME_MAX_LENGTH / 2)
        ).success
      ).toBe(true);
      expect(
        uiamServiceAccountNameSchema.safeParse(
          emoji.repeat(UIAM_SERVICE_ACCOUNT_NAME_MAX_LENGTH / 2 + 1)
        ).success
      ).toBe(false);
    });

    // The cap applies to the raw input, so the route's body cap covers every name that passes.
    it('applies the length cap before trimming', () => {
      expect(
        uiamServiceAccountNameSchema.safeParse(
          ` ${'a'.repeat(UIAM_SERVICE_ACCOUNT_NAME_MAX_LENGTH)}`
        ).success
      ).toBe(false);
    });

    // UIAM accepts control characters, but the name is written to logs and audit events.
    it.each(['', ' ', '\u3000', 'line\nbreak', 'tab\tseparated', 'nul\u0000', 'next\u0085line'])(
      'rejects %j',
      (name) => {
        expect(uiamServiceAccountNameSchema.safeParse(name).success).toBe(false);
      }
    );
  });

  describe('getServiceAccountRolesSchema', () => {
    const schema = getServiceAccountRolesSchema({ maxRoles: 2, maxRoleNameLength: 5 });

    it('rejects an empty role list', () => {
      expect(schema.safeParse([]).success).toBe(false);
    });

    it('rejects an empty role name', () => {
      expect(schema.safeParse(['']).success).toBe(false);
    });

    it('bounds the role name length', () => {
      expect(schema.safeParse(['a'.repeat(5)]).success).toBe(true);
      expect(schema.safeParse(['a'.repeat(6)]).success).toBe(false);
    });

    it('bounds the number of roles', () => {
      expect(schema.safeParse(['a', 'b']).success).toBe(true);
      expect(schema.safeParse(['a', 'b', 'c']).success).toBe(false);
    });

    it('drops duplicates before counting, keeping first occurrences in order', () => {
      expect(schema.parse(['b', 'a', 'b', 'a'])).toEqual(['b', 'a']);
    });
  });

  describe('serviceAccountDescriptionSchema', () => {
    const max = 'a'.repeat(SERVICE_ACCOUNT_DESCRIPTION_MAX_LENGTH);

    it('trims leading and trailing whitespace', () => {
      expect(serviceAccountDescriptionSchema.parse('  Relays the nightshift alerts.\n')).toBe(
        'Relays the nightshift alerts.'
      );
    });

    it.each(['', '   ', '\n\t'])('treats %j as no description', (description) => {
      expect(serviceAccountDescriptionSchema.parse(description)).toBeUndefined();
    });

    it('enforces the length boundary on the raw input', () => {
      expect(serviceAccountDescriptionSchema.safeParse(max).success).toBe(true);
      expect(serviceAccountDescriptionSchema.safeParse(`${max}a`).success).toBe(false);
      // Whitespace counts toward the cap, so the body limit on the route holds for every valid input.
      expect(serviceAccountDescriptionSchema.safeParse(`${max} `).success).toBe(false);
    });

    it('counts UTF-16 code units, so an emoji counts as two', () => {
      expect(serviceAccountDescriptionSchema.safeParse(`${max.slice(2)}🙂`).success).toBe(true);
      expect(serviceAccountDescriptionSchema.safeParse(`${max.slice(1)}🙂`).success).toBe(false);
    });

    it.each([null, 123, ['a']])('rejects %j', (description) => {
      expect(serviceAccountDescriptionSchema.safeParse(description).success).toBe(false);
    });
  });
});
