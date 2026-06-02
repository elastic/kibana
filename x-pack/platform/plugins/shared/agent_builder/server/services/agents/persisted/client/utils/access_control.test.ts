/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderDefaultAgentId,
  AgentAclRole,
  AgentType,
  AgentVisibility,
} from '@kbn/agent-builder-common';
import type { AgentProperties } from '../storage';
import {
  hasReadAccess,
  hasWriteAccess,
  buildVisibilityReadFilter,
  redactAclForCaller,
  validateVisibilityUpdateAccess,
} from './access_control';

const baseSource: AgentProperties = {
  id: 'agent-1',
  name: 'Test Agent',
  type: AgentType.chat,
  space: 'default',
  description: 'Test',
  config: { tools: [] },
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

const ownerUser = { id: 'user-1', username: 'owner' };
const nonOwnerUser = { id: 'user-2', username: 'other' };
const ownerByUsernameOnly = { username: 'owner' };

describe('hasReadAccess', () => {
  it('returns true for users with visibility access override regardless of visibility', () => {
    const source = { ...baseSource, visibility: AgentVisibility.Private, created_by_name: 'owner' };
    expect(hasReadAccess({ source, user: nonOwnerUser, isAdmin: true })).toBe(true);
  });

  it('returns true for owner regardless of visibility', () => {
    const source = { ...baseSource, visibility: AgentVisibility.Private, created_by_name: 'owner' };
    expect(hasReadAccess({ source, user: ownerUser, isAdmin: false })).toBe(true);
  });

  it('returns true for owner by username only', () => {
    const source = { ...baseSource, visibility: AgentVisibility.Private, created_by_name: 'owner' };
    expect(hasReadAccess({ source, user: ownerByUsernameOnly, isAdmin: false })).toBe(true);
  });

  it('returns true for non-owner when visibility is undefined (legacy agent treated as public)', () => {
    const source = { ...baseSource, created_by_name: 'owner' };
    expect(hasReadAccess({ source, user: nonOwnerUser, isAdmin: false })).toBe(true);
  });

  it('returns true for non-owner when visibility is shared', () => {
    const source = {
      ...baseSource,
      visibility: AgentVisibility.Shared,
      created_by_name: 'owner',
    };
    expect(hasReadAccess({ source, user: nonOwnerUser, isAdmin: false })).toBe(true);
  });

  it('returns false for non-owner when visibility is private', () => {
    const source = {
      ...baseSource,
      visibility: AgentVisibility.Private,
      created_by_name: 'owner',
    };
    expect(hasReadAccess({ source, user: nonOwnerUser, isAdmin: false })).toBe(false);
  });
});

describe('hasWriteAccess', () => {
  it('returns true for users with visibility access override regardless of visibility', () => {
    const source = { ...baseSource, visibility: AgentVisibility.Private, created_by_name: 'owner' };
    expect(hasWriteAccess({ source, user: nonOwnerUser, isAdmin: true })).toBe(true);
  });

  it('returns true for owner regardless of visibility', () => {
    const source = { ...baseSource, visibility: AgentVisibility.Private, created_by_name: 'owner' };
    expect(hasWriteAccess({ source, user: ownerUser, isAdmin: false })).toBe(true);
  });

  it('returns true for non-owner when visibility is undefined (legacy agent treated as public)', () => {
    const source = { ...baseSource, created_by_name: 'owner' };
    expect(hasWriteAccess({ source, user: nonOwnerUser, isAdmin: false })).toBe(true);
  });

  it('returns false for non-owner when visibility is shared', () => {
    const source = {
      ...baseSource,
      visibility: AgentVisibility.Shared,
      created_by_name: 'owner',
    };
    expect(hasWriteAccess({ source, user: nonOwnerUser, isAdmin: false })).toBe(false);
  });

  it('returns false for non-owner when visibility is private', () => {
    const source = {
      ...baseSource,
      visibility: AgentVisibility.Private,
      created_by_name: 'owner',
    };
    expect(hasWriteAccess({ source, user: nonOwnerUser, isAdmin: false })).toBe(false);
  });
});

describe('buildVisibilityReadFilter', () => {
  it('includes owner clauses, the not-private visibility clause, and a nested user-ACL clause', () => {
    const filter = buildVisibilityReadFilter({ user: ownerUser });
    expect(filter).toEqual({
      bool: {
        should: [
          { bool: { must_not: { term: { visibility: AgentVisibility.Private } } } },
          { term: { created_by_name: 'owner' } },
          { term: { created_by_id: 'user-1' } },
          {
            nested: {
              path: 'acl.entries',
              query: {
                bool: {
                  filter: [
                    { term: { 'acl.entries.type': 'user' } },
                    { term: { 'acl.entries.name': 'owner' } },
                  ],
                },
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('omits created_by_id clause when user.id is undefined but still adds user-ACL nested clause', () => {
    const filter = buildVisibilityReadFilter({ user: ownerByUsernameOnly });
    expect(filter.bool.should).toHaveLength(3);
    expect(filter.bool.should[0]).toEqual({
      bool: { must_not: { term: { visibility: AgentVisibility.Private } } },
    });
    expect(filter.bool.should[1]).toEqual({ term: { created_by_name: 'owner' } });
    expect(filter.bool.should[2]).toEqual({
      nested: {
        path: 'acl.entries',
        query: {
          bool: {
            filter: [
              { term: { 'acl.entries.type': 'user' } },
              { term: { 'acl.entries.name': 'owner' } },
            ],
          },
        },
      },
    });
  });

  it('only emits user-type nested ACL clauses (V1)', () => {
    const filter = buildVisibilityReadFilter({ user: ownerUser });
    const types = (filter.bool.should as Array<Record<string, any>>)
      .flatMap((clause) => clause.nested?.query?.bool?.filter ?? [])
      .map((f) => f.term?.['acl.entries.type'])
      .filter(Boolean);
    expect(types).toEqual(['user']);
  });
});

describe('validateVisibilityUpdateAccess', () => {
  it('returns true when update does not change visibility', () => {
    const source = {
      ...baseSource,
      visibility: AgentVisibility.Public,
      created_by_name: 'owner',
    };
    expect(
      validateVisibilityUpdateAccess({
        source,
        update: { name: 'New Name' },
        user: nonOwnerUser,
        isAdmin: false,
      })
    ).toBe(true);
  });

  it('returns true when update.visibility is undefined', () => {
    const source = {
      ...baseSource,
      visibility: AgentVisibility.Private,
      created_by_name: 'owner',
    };
    expect(
      validateVisibilityUpdateAccess({
        source,
        update: { description: 'Updated' },
        user: nonOwnerUser,
        isAdmin: false,
      })
    ).toBe(true);
  });

  it('returns true when visibility change is to same value (no actual change)', () => {
    const source = {
      ...baseSource,
      visibility: AgentVisibility.Public,
      created_by_name: 'owner',
    };
    expect(
      validateVisibilityUpdateAccess({
        source,
        update: { visibility: AgentVisibility.Public },
        user: nonOwnerUser,
        isAdmin: false,
      })
    ).toBe(true);
  });

  it('returns true for owner changing visibility', () => {
    const source = {
      ...baseSource,
      visibility: AgentVisibility.Public,
      created_by_name: 'owner',
    };
    expect(
      validateVisibilityUpdateAccess({
        source,
        update: { visibility: AgentVisibility.Private },
        user: ownerUser,
        isAdmin: false,
      })
    ).toBe(true);
  });

  it('returns true for users with visibility access override changing visibility', () => {
    const source = {
      ...baseSource,
      visibility: AgentVisibility.Public,
      created_by_name: 'owner',
    };
    expect(
      validateVisibilityUpdateAccess({
        source,
        update: { visibility: AgentVisibility.Private },
        user: nonOwnerUser,
        isAdmin: true,
      })
    ).toBe(true);
  });

  it('returns false for non-owner without visibility access override changing visibility', () => {
    const source = {
      ...baseSource,
      visibility: AgentVisibility.Public,
      created_by_name: 'owner',
    };
    expect(
      validateVisibilityUpdateAccess({
        source,
        update: { visibility: AgentVisibility.Private },
        user: nonOwnerUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  it('returns false when changing visibility of the default agent even for owner', () => {
    const source = {
      ...baseSource,
      id: agentBuilderDefaultAgentId,
      visibility: AgentVisibility.Public,
      created_by_id: ownerUser.id,
      created_by_name: ownerUser.username,
    };
    expect(
      validateVisibilityUpdateAccess({
        source,
        update: { visibility: AgentVisibility.Private },
        user: ownerUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  it('returns false when changing visibility of the default agent even with override', () => {
    const source = {
      ...baseSource,
      id: agentBuilderDefaultAgentId,
      visibility: AgentVisibility.Public,
      created_by_name: 'owner',
    };
    expect(
      validateVisibilityUpdateAccess({
        source,
        update: { visibility: AgentVisibility.Shared },
        user: nonOwnerUser,
        isAdmin: true,
      })
    ).toBe(false);
  });
});

describe('redactAclForCaller', () => {
  const aliceEntry = { type: 'user' as const, name: 'alice', role: AgentAclRole.Editor };
  const bobEntry = { type: 'user' as const, name: 'bob', role: AgentAclRole.User };

  const privateAgentWithAcl: AgentProperties = {
    ...baseSource,
    visibility: AgentVisibility.Private,
    created_by_name: 'owner',
    acl: { entries: [aliceEntry, bobEntry] },
  };

  it('returns the definition unchanged when there is no acl', () => {
    const definition = { id: 'a', acl: undefined };
    const result = redactAclForCaller({
      definition,
      source: baseSource,
      user: nonOwnerUser,
      isAdmin: false,
    });
    expect(result).toBe(definition);
  });

  it('returns the definition unchanged when acl entries are empty', () => {
    const definition = { id: 'a', acl: { entries: [] } };
    const result = redactAclForCaller({
      definition,
      source: { ...baseSource, acl: { entries: [] } },
      user: nonOwnerUser,
      isAdmin: false,
    });
    expect(result).toBe(definition);
  });

  it('returns the full entries list for the agent owner', () => {
    const definition = { id: 'a', acl: { entries: [aliceEntry, bobEntry] } };
    const result = redactAclForCaller({
      definition,
      source: privateAgentWithAcl,
      user: ownerUser,
      isAdmin: false,
    });
    expect(result.acl?.entries).toEqual([aliceEntry, bobEntry]);
  });

  it('returns the full entries list for a cluster admin', () => {
    const definition = { id: 'a', acl: { entries: [aliceEntry, bobEntry] } };
    const result = redactAclForCaller({
      definition,
      source: privateAgentWithAcl,
      user: nonOwnerUser,
      isAdmin: true,
    });
    expect(result.acl?.entries).toEqual([aliceEntry, bobEntry]);
  });

  it('redacts entries to [] for a user without manage rights', () => {
    // Bob has User access via the ACL (User < Editor threshold) so he cannot manage.
    const bobUser = { username: 'bob' };
    const definition = { id: 'a', acl: { entries: [aliceEntry, bobEntry] } };
    const result = redactAclForCaller({
      definition,
      source: privateAgentWithAcl,
      user: bobUser,
      isAdmin: false,
    });
    expect(result.acl?.entries).toEqual([]);
    // Shallow-copy: the original definition is untouched.
    expect(definition.acl?.entries).toEqual([aliceEntry, bobEntry]);
  });

  it('returns the full entries list for a user with Editor or higher via the ACL', () => {
    // Alice has Editor via the ACL, which meets the manage-ACL threshold.
    const aliceUser = { username: 'alice' };
    const definition = { id: 'a', acl: { entries: [aliceEntry, bobEntry] } };
    const result = redactAclForCaller({
      definition,
      source: privateAgentWithAcl,
      user: aliceUser,
      isAdmin: false,
    });
    expect(result.acl?.entries).toEqual([aliceEntry, bobEntry]);
  });

  it('redacts entries on the default agent even for the owner', () => {
    // Default agent never accepts ACL management — even the owner gets [] back.
    const definition = { id: agentBuilderDefaultAgentId, acl: { entries: [aliceEntry] } };
    const result = redactAclForCaller({
      definition,
      source: {
        ...baseSource,
        id: agentBuilderDefaultAgentId,
        created_by_name: 'owner',
        acl: { entries: [aliceEntry] },
      },
      user: ownerUser,
      isAdmin: false,
    });
    expect(result.acl?.entries).toEqual([]);
  });
});
