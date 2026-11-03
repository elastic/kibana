/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_ACCOUNT_DESCRIPTION_MAX_LENGTH,
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  SERVICE_ACCOUNT_NAME_MAX_LENGTH,
} from './constants';
import {
  getServiceAccountRolesSchema,
  serviceAccountDescriptionSchema,
  serviceAccountIdSchema,
  serviceAccountNameSchema,
} from './schemas';

describe('service account schemas', () => {
  it.each([
    [serviceAccountIdSchema, SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH],
    [serviceAccountNameSchema, SERVICE_ACCOUNT_NAME_MAX_LENGTH],
  ] as const)('enforces the string length boundary', (schema, maxLength) => {
    expect(schema.safeParse('a'.repeat(maxLength)).success).toBe(true);
    expect(schema.safeParse('a'.repeat(maxLength + 1)).success).toBe(false);
    expect(schema.safeParse(123).success).toBe(false);
  });

  describe('serviceAccountNameSchema', () => {
    it.each(['a', 'A', '0', 'nightshift-relay', 'nightshift_relay', 'relay-1_2'])(
      'accepts %s',
      (name) => {
        expect(serviceAccountNameSchema.safeParse(name).success).toBe(true);
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
      expect(serviceAccountNameSchema.safeParse(name).success).toBe(false);
    });
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
