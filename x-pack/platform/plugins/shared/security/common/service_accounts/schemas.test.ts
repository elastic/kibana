/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  SERVICE_ACCOUNT_NAME_MAX_LENGTH,
} from './constants';
import {
  getServiceAccountRolesSchema,
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
});
