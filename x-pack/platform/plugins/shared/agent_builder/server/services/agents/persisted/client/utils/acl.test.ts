/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_ACL_MAX_ENTRIES,
  AgentAclRole,
  type AgentAclEntry,
} from '@kbn/agent-builder-common';
import {
  AclConflictError,
  createAclConflictError,
  isAclConflictError,
  validateAclUpdate,
} from './acl';

const entry = (over: Partial<AgentAclEntry> = {}): AgentAclEntry => ({
  type: 'user',
  name: 'alice',
  role: AgentAclRole.Viewer,
  ...over,
});

describe('validateAclUpdate', () => {
  test('accepts an empty list', () => {
    expect(validateAclUpdate([])).toBeUndefined();
  });

  test('accepts a list of valid entries', () => {
    expect(
      validateAclUpdate([
        entry({ name: 'alice', role: AgentAclRole.Editor }),
        entry({ type: 'role', name: 'analyst', role: AgentAclRole.User }),
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

  test('rejects unknown principal type', () => {
    expect(
      validateAclUpdate([{ ...entry(), type: 'group' as 'user' }])
    ).toMatch(/type of "user" or "role"/);
  });

  test('rejects empty principal name', () => {
    expect(validateAclUpdate([entry({ name: '' })])).toMatch(/non-empty/);
  });

  test('rejects unknown role', () => {
    expect(
      validateAclUpdate([{ ...entry(), role: 'super-admin' as AgentAclRole }])
    ).toMatch(/Unknown ACL role/);
  });

  test('rejects duplicate (type, name) pairs', () => {
    expect(
      validateAclUpdate([
        entry({ name: 'alice' }),
        entry({ name: 'alice', role: AgentAclRole.Manager }),
      ])
    ).toMatch(/Duplicate/);
  });

  test('allows the same name across different principal types', () => {
    expect(
      validateAclUpdate([
        entry({ type: 'user', name: 'analyst' }),
        entry({ type: 'role', name: 'analyst' }),
      ])
    ).toBeUndefined();
  });
});

describe('AclConflictError', () => {
  test('createAclConflictError produces a 409-tagged error', () => {
    const err = createAclConflictError('stale');
    expect(err).toBeInstanceOf(AclConflictError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('stale');
  });

  test('isAclConflictError matches AclConflictError instances', () => {
    expect(isAclConflictError(createAclConflictError('x'))).toBe(true);
  });

  test('isAclConflictError ignores arbitrary errors', () => {
    expect(isAclConflictError(new Error('nope'))).toBe(false);
    expect(isAclConflictError(null)).toBe(false);
    expect(isAclConflictError({})).toBe(false);
  });
});
