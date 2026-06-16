/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderDefaultAgentId,
  AgentAccessControlRole,
  AgentType,
  AgentAccessControlScope,
} from '@kbn/agent-builder-common';
import type { AgentProperties } from '../storage';
import {
  hasReadAccess,
  hasWriteAccess,
  buildAccessControlReadFilter,
  redactAccessControlForCaller,
  validateAccessControlUpdateAccess,
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
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Private, entries: [] },
      created_by_name: 'owner',
    };
    expect(hasReadAccess({ source, user: nonOwnerUser, isAdmin: true })).toBe(true);
  });

  it('returns true for owner regardless of visibility', () => {
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Private, entries: [] },
      created_by_name: 'owner',
    };
    expect(hasReadAccess({ source, user: ownerUser, isAdmin: false })).toBe(true);
  });

  it('returns true for owner by username only', () => {
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Private, entries: [] },
      created_by_name: 'owner',
    };
    expect(hasReadAccess({ source, user: ownerByUsernameOnly, isAdmin: false })).toBe(true);
  });

  it('returns true for non-owner when visibility is undefined (legacy agent treated as public)', () => {
    const source = { ...baseSource, created_by_name: 'owner' };
    expect(hasReadAccess({ source, user: nonOwnerUser, isAdmin: false })).toBe(true);
  });

  it('returns true for non-owner when visibility is shared', () => {
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Shared, entries: [] },
      created_by_name: 'owner',
    };
    expect(hasReadAccess({ source, user: nonOwnerUser, isAdmin: false })).toBe(true);
  });

  it('returns false for non-owner when visibility is private', () => {
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Private, entries: [] },
      created_by_name: 'owner',
    };
    expect(hasReadAccess({ source, user: nonOwnerUser, isAdmin: false })).toBe(false);
  });
});

describe('hasWriteAccess', () => {
  it('returns true for users with visibility access override regardless of visibility', () => {
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Private, entries: [] },
      created_by_name: 'owner',
    };
    expect(hasWriteAccess({ source, user: nonOwnerUser, isAdmin: true })).toBe(true);
  });

  it('returns true for owner regardless of visibility', () => {
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Private, entries: [] },
      created_by_name: 'owner',
    };
    expect(hasWriteAccess({ source, user: ownerUser, isAdmin: false })).toBe(true);
  });

  it('returns true for non-owner when visibility is undefined (legacy agent treated as public)', () => {
    const source = { ...baseSource, created_by_name: 'owner' };
    expect(hasWriteAccess({ source, user: nonOwnerUser, isAdmin: false })).toBe(true);
  });

  it('returns false for non-owner when visibility is shared', () => {
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Shared, entries: [] },
      created_by_name: 'owner',
    };
    expect(hasWriteAccess({ source, user: nonOwnerUser, isAdmin: false })).toBe(false);
  });

  it('returns false for non-owner when visibility is private', () => {
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Private, entries: [] },
      created_by_name: 'owner',
    };
    expect(hasWriteAccess({ source, user: nonOwnerUser, isAdmin: false })).toBe(false);
  });
});

describe('buildAccessControlReadFilter', () => {
  it('includes owner clauses, the not-private visibility clause, and a nested user-ACL clause', () => {
    const filter = buildAccessControlReadFilter({ user: ownerUser });
    expect(filter).toEqual({
      bool: {
        should: [
          {
            bool: {
              must_not: { term: { 'access_control.scope': AgentAccessControlScope.Private } },
            },
          },
          { term: { created_by_name: 'owner' } },
          { term: { created_by_id: 'user-1' } },
          {
            nested: {
              path: 'access_control.entries',
              query: {
                bool: {
                  filter: [
                    { term: { 'access_control.entries.type': 'user' } },
                    { term: { 'access_control.entries.name': 'owner' } },
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
    const filter = buildAccessControlReadFilter({ user: ownerByUsernameOnly });
    expect(filter.bool.should).toHaveLength(3);
    expect(filter.bool.should[0]).toEqual({
      bool: { must_not: { term: { 'access_control.scope': AgentAccessControlScope.Private } } },
    });
    expect(filter.bool.should[1]).toEqual({ term: { created_by_name: 'owner' } });
    expect(filter.bool.should[2]).toEqual({
      nested: {
        path: 'access_control.entries',
        query: {
          bool: {
            filter: [
              { term: { 'access_control.entries.type': 'user' } },
              { term: { 'access_control.entries.name': 'owner' } },
            ],
          },
        },
      },
    });
  });

  it('only emits user-type nested accessControl clauses (V1)', () => {
    const filter = buildAccessControlReadFilter({ user: ownerUser });
    const types = (filter.bool.should as Array<Record<string, any>>)
      .flatMap((clause) => clause.nested?.query?.bool?.filter ?? [])
      .map((f) => f.term?.['access_control.entries.type'])
      .filter(Boolean);
    expect(types).toEqual(['user']);
  });
});

describe('validateAccessControlUpdateAccess', () => {
  it('returns true when update does not change visibility', () => {
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Public, entries: [] },
      created_by_name: 'owner',
    };
    expect(
      validateAccessControlUpdateAccess({
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
      access_control: { scope: AgentAccessControlScope.Private, entries: [] },
      created_by_name: 'owner',
    };
    expect(
      validateAccessControlUpdateAccess({
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
      access_control: { scope: AgentAccessControlScope.Public, entries: [] },
      created_by_name: 'owner',
    };
    expect(
      validateAccessControlUpdateAccess({
        source,
        update: { accessControl: { scope: AgentAccessControlScope.Public, entries: [] } },
        user: nonOwnerUser,
        isAdmin: false,
      })
    ).toBe(true);
  });

  it('returns true for owner changing visibility', () => {
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Public, entries: [] },
      created_by_name: 'owner',
    };
    expect(
      validateAccessControlUpdateAccess({
        source,
        update: { accessControl: { scope: AgentAccessControlScope.Private, entries: [] } },
        user: ownerUser,
        isAdmin: false,
      })
    ).toBe(true);
  });

  it('returns true for users with visibility access override changing visibility', () => {
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Public, entries: [] },
      created_by_name: 'owner',
    };
    expect(
      validateAccessControlUpdateAccess({
        source,
        update: { accessControl: { scope: AgentAccessControlScope.Private, entries: [] } },
        user: nonOwnerUser,
        isAdmin: true,
      })
    ).toBe(true);
  });

  it('returns false for non-owner without visibility access override changing visibility', () => {
    const source = {
      ...baseSource,
      access_control: { scope: AgentAccessControlScope.Public, entries: [] },
      created_by_name: 'owner',
    };
    expect(
      validateAccessControlUpdateAccess({
        source,
        update: { accessControl: { scope: AgentAccessControlScope.Private, entries: [] } },
        user: nonOwnerUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  it('returns false when changing visibility of the default agent even for owner', () => {
    const source = {
      ...baseSource,
      id: agentBuilderDefaultAgentId,
      access_control: { scope: AgentAccessControlScope.Public, entries: [] },
      created_by_id: ownerUser.id,
      created_by_name: ownerUser.username,
    };
    expect(
      validateAccessControlUpdateAccess({
        source,
        update: { accessControl: { scope: AgentAccessControlScope.Private, entries: [] } },
        user: ownerUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  it('returns false when changing visibility of the default agent even with override', () => {
    const source = {
      ...baseSource,
      id: agentBuilderDefaultAgentId,
      access_control: { scope: AgentAccessControlScope.Public, entries: [] },
      created_by_name: 'owner',
    };
    expect(
      validateAccessControlUpdateAccess({
        source,
        update: { accessControl: { scope: AgentAccessControlScope.Shared, entries: [] } },
        user: nonOwnerUser,
        isAdmin: true,
      })
    ).toBe(false);
  });
});

describe('redactAccessControlForCaller', () => {
  const aliceEntry = { type: 'user' as const, name: 'alice', role: AgentAccessControlRole.Editor };
  const bobEntry = { type: 'user' as const, name: 'bob', role: AgentAccessControlRole.User };

  const privateAgentWithAcl: AgentProperties = {
    ...baseSource,
    access_control: {
      scope: AgentAccessControlScope.Private,
      entries: [aliceEntry, bobEntry],
    },
    created_by_name: 'owner',
  };

  it('returns the definition unchanged when there is no accessControl', () => {
    const definition = { id: 'a', accessControl: undefined };
    const result = redactAccessControlForCaller({
      definition,
      source: baseSource,
      user: nonOwnerUser,
      isAdmin: false,
    });
    expect(result).toBe(definition);
  });

  it('returns the definition unchanged when accessControl entries are empty', () => {
    const definition = {
      id: 'a',
      accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
    };
    const result = redactAccessControlForCaller({
      definition,
      source: {
        ...baseSource,
        access_control: { scope: AgentAccessControlScope.Private, entries: [] },
      },
      user: nonOwnerUser,
      isAdmin: false,
    });
    expect(result).toBe(definition);
  });

  it('returns the full entries list for the agent owner', () => {
    const definition = {
      id: 'a',
      accessControl: {
        scope: AgentAccessControlScope.Private,
        entries: [aliceEntry, bobEntry],
      },
    };
    const result = redactAccessControlForCaller({
      definition,
      source: privateAgentWithAcl,
      user: ownerUser,
      isAdmin: false,
    });
    expect(result.accessControl?.entries).toEqual([aliceEntry, bobEntry]);
  });

  it('returns the full entries list for a cluster admin', () => {
    const definition = {
      id: 'a',
      accessControl: {
        scope: AgentAccessControlScope.Private,
        entries: [aliceEntry, bobEntry],
      },
    };
    const result = redactAccessControlForCaller({
      definition,
      source: privateAgentWithAcl,
      user: nonOwnerUser,
      isAdmin: true,
    });
    expect(result.accessControl?.entries).toEqual([aliceEntry, bobEntry]);
  });

  it('redacts entries to [] for a user without manage rights', () => {
    // Bob has User access via the accessControl (User < Editor threshold) so he cannot manage.
    const bobUser = { username: 'bob' };
    const definition = {
      id: 'a',
      accessControl: {
        scope: AgentAccessControlScope.Private,
        entries: [aliceEntry, bobEntry],
      },
    };
    const result = redactAccessControlForCaller({
      definition,
      source: privateAgentWithAcl,
      user: bobUser,
      isAdmin: false,
    });
    expect(result.accessControl?.entries).toEqual([]);
    // Shallow-copy: the original definition is untouched.
    expect(definition.accessControl?.entries).toEqual([aliceEntry, bobEntry]);
  });

  it('returns the full entries list for a user with Editor or higher via the accessControl', () => {
    // Alice has Editor via the accessControl, which meets the manage-ACL threshold.
    const aliceUser = { username: 'alice' };
    const definition = {
      id: 'a',
      accessControl: {
        scope: AgentAccessControlScope.Private,
        entries: [aliceEntry, bobEntry],
      },
    };
    const result = redactAccessControlForCaller({
      definition,
      source: privateAgentWithAcl,
      user: aliceUser,
      isAdmin: false,
    });
    expect(result.accessControl?.entries).toEqual([aliceEntry, bobEntry]);
  });

  it('redacts entries on the default agent even for the owner', () => {
    // Default agent never accepts accessControl management — even the owner gets [] back.
    const definition = {
      id: agentBuilderDefaultAgentId,
      accessControl: { scope: AgentAccessControlScope.Private, entries: [aliceEntry] },
    };
    const result = redactAccessControlForCaller({
      definition,
      source: {
        ...baseSource,
        id: agentBuilderDefaultAgentId,
        created_by_name: 'owner',
        access_control: { scope: AgentAccessControlScope.Private, entries: [aliceEntry] },
      },
      user: ownerUser,
      isAdmin: false,
    });
    expect(result.accessControl?.entries).toEqual([]);
  });
});
