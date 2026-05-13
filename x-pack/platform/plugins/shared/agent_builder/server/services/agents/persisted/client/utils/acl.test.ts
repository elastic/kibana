/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_ACL_MAX_ENTRIES, AgentAclRole, type AgentAclEntry } from '@kbn/agent-builder-common';
import { validateAclUpdate } from './acl';

const entry = (over: Partial<AgentAclEntry> = {}): AgentAclEntry => ({
  type: 'user',
  name: 'alice',
  role: AgentAclRole.User,
  ...over,
});

describe('validateAclUpdate', () => {
  test('accepts an empty list', () => {
    expect(validateAclUpdate([])).toBeUndefined();
  });

  test('accepts a list of valid user entries', () => {
    expect(
      validateAclUpdate([
        entry({ name: 'alice', role: AgentAclRole.Editor }),
        entry({ name: 'bob', role: AgentAclRole.User }),
      ])
    ).toBeUndefined();
  });

  test('rejects non-array input', () => {
    // Cast to bypass the type guard; we want to verify the runtime check.
    expect(validateAclUpdate(undefined as unknown as AgentAclEntry[])).toMatch(/array/);
  });

  test('rejects entries past the maximum', () => {
    const tooMany: AgentAclEntry[] = Array.from({ length: AGENT_ACL_MAX_ENTRIES + 1 }, (_, i) =>
      entry({ name: `user${i}` })
    );
    expect(validateAclUpdate(tooMany)).toMatch(/maximum/);
  });

  test('rejects role-type entries (V1 supports user-only; V2 will add roles)', () => {
    expect(
      validateAclUpdate([{ ...entry(), type: 'role' as 'user', name: 'analyst' }])
    ).toMatch(/type of "user"/);
  });

  test('rejects unknown principal type', () => {
    expect(validateAclUpdate([{ ...entry(), type: 'group' as 'user' }])).toMatch(
      /type of "user"/
    );
  });

  test('rejects empty principal name', () => {
    expect(validateAclUpdate([entry({ name: '' })])).toMatch(/non-empty/);
  });

  test('rejects unknown role', () => {
    expect(validateAclUpdate([{ ...entry(), role: 'super-admin' as AgentAclRole }])).toMatch(
      /Unknown ACL role/
    );
  });

  test('rejects duplicate (type, name) pairs', () => {
    expect(
      validateAclUpdate([
        entry({ name: 'alice' }),
        entry({ name: 'alice', role: AgentAclRole.Manager }),
      ])
    ).toMatch(/Duplicate/);
  });
});
