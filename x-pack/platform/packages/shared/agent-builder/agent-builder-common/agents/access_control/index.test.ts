/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAgentOwner,
  canChangeAgentAccessControlScope,
  canDeleteAgent,
  canManageAgentAccessControl,
  getEffectiveAgentRole,
  hasAgentReadAccess,
  hasAgentUseAccess,
  hasAgentWriteAccess,
  canCurrentUserEditAgent,
} from '.';
import type { AgentConfiguration, AgentDefinition } from '../definition';
import { agentBuilderDefaultAgentId, AgentType } from '../definition';
import { AgentAccessControlRole, AgentAccessControlScope } from './types';
import type { CurrentUser, UserIdAndName } from '../../base/users';

const owner: UserIdAndName = { id: 'owner-id', username: 'owner-user' };
const currentUser: UserIdAndName = { id: 'owner-id', username: 'owner-user' };
const otherUser: UserIdAndName = { id: 'other-id', username: 'other-user' };

describe('isAgentOwner', () => {
  test('returns false when owner is undefined', () => {
    expect(isAgentOwner({ owner: undefined, currentUser })).toBe(false);
  });

  test('returns false when currentUser is undefined', () => {
    expect(isAgentOwner({ owner, currentUser: undefined })).toBe(false);
  });

  test('returns false when currentUser is null', () => {
    expect(isAgentOwner({ owner, currentUser: null })).toBe(false);
  });

  test('returns true when currentUser.id equals owner.id', () => {
    expect(isAgentOwner({ owner, currentUser })).toBe(true);
  });

  test('returns true when usernames match (id not used)', () => {
    const ownerByUsername: UserIdAndName = { username: 'alice' };
    const userByUsername: UserIdAndName = { username: 'alice' };
    expect(isAgentOwner({ owner: ownerByUsername, currentUser: userByUsername })).toBe(true);
  });

  test('returns false when ids differ and usernames differ', () => {
    expect(isAgentOwner({ owner, currentUser: otherUser })).toBe(false);
  });

  test('returns true when ids match even if usernames differ', () => {
    const sameIdUser: UserIdAndName = { id: 'owner-id', username: 'different-username' };
    expect(isAgentOwner({ owner, currentUser: sameIdUser })).toBe(true);
  });

  test('returns false when both ids are defined but differ (no username fallback)', () => {
    const ownerWithId: UserIdAndName = { id: 'owner-id', username: 'alice' };
    const userSameUsernameDifferentId: UserIdAndName = { id: 'other-id', username: 'alice' };
    expect(isAgentOwner({ owner: ownerWithId, currentUser: userSameUsernameDifferentId })).toBe(
      false
    );
  });

  test('returns false when owner has username only and current user has different username', () => {
    const ownerWithUsernameOnly: UserIdAndName = { username: 'alice' };
    const userWithDifferentUsername: UserIdAndName = { id: 'user-id', username: 'bob' };
    expect(
      isAgentOwner({ owner: ownerWithUsernameOnly, currentUser: userWithDifferentUsername })
    ).toBe(false);
  });
});

describe('canChangeAgentAccessControlScope', () => {
  test('returns true when isAdmin is true', () => {
    expect(
      canChangeAgentAccessControlScope({
        owner,
        currentUser: otherUser,
        isAdmin: true,
      })
    ).toBe(true);
  });

  test('returns false when override is false and current user is not owner', () => {
    expect(
      canChangeAgentAccessControlScope({
        owner,
        currentUser: otherUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  test('returns true when override is false but current user is owner (by id)', () => {
    expect(
      canChangeAgentAccessControlScope({
        owner,
        currentUser,
        isAdmin: false,
      })
    ).toBe(true);
  });

  test('returns true when override is false but current user is owner (by username)', () => {
    const ownerByUsername: UserIdAndName = { username: 'alice' };
    const userByUsername: UserIdAndName = { username: 'alice' };
    expect(
      canChangeAgentAccessControlScope({
        owner: ownerByUsername,
        currentUser: userByUsername,
        isAdmin: false,
      })
    ).toBe(true);
  });

  test('returns false for the default agent even when user is owner', () => {
    expect(
      canChangeAgentAccessControlScope({
        agentId: agentBuilderDefaultAgentId,
        owner,
        currentUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  test('returns false for the default agent even with access-control override', () => {
    expect(
      canChangeAgentAccessControlScope({
        agentId: agentBuilderDefaultAgentId,
        owner,
        currentUser: otherUser,
        isAdmin: true,
      })
    ).toBe(false);
  });
});

describe('hasAgentReadAccess', () => {
  const baseArgs = {
    owner,
    currentUser: otherUser,
    isAdmin: false,
  };

  test('returns true when isAdmin is true', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
        isAdmin: true,
      })
    ).toBe(true);
  });

  test('returns true when current user is owner', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
        currentUser,
      })
    ).toBe(true);
  });

  test('returns true when access-control scope is Public', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        accessControl: { scope: AgentAccessControlScope.Public, entries: [] },
      })
    ).toBe(true);
  });

  test('returns true when access-control scope is Shared', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        accessControl: { scope: AgentAccessControlScope.Shared, entries: [] },
      })
    ).toBe(true);
  });

  test('returns false when access-control scope is Private and user is not owner and no override', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
      })
    ).toBe(false);
  });

  test('when access-control scope is undefined (legacy agent), treats as Public so any user can read', () => {
    expect(
      hasAgentReadAccess({
        owner,
        currentUser: otherUser,
        isAdmin: false,
      })
    ).toBe(true);
  });
});

describe('hasAgentWriteAccess', () => {
  const baseArgs = {
    owner,
    currentUser: otherUser,
    isAdmin: false,
  };

  test('returns true when isAdmin is true', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
        isAdmin: true,
      })
    ).toBe(true);
  });

  test('returns true when current user is owner', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
        currentUser,
      })
    ).toBe(true);
  });

  test('returns true when access-control scope is Public', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        accessControl: { scope: AgentAccessControlScope.Public, entries: [] },
      })
    ).toBe(true);
  });

  test('returns false when access-control scope is Shared and user is not owner', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        accessControl: { scope: AgentAccessControlScope.Shared, entries: [] },
      })
    ).toBe(false);
  });

  test('returns false when access-control scope is Private and user is not owner', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
      })
    ).toBe(false);
  });

  test('when access-control scope is undefined (legacy agent), treats as Public so any user can write', () => {
    expect(
      hasAgentWriteAccess({
        owner,
        currentUser: otherUser,
        isAdmin: false,
      })
    ).toBe(true);
  });
});

describe('canCurrentUserEditAgent', () => {
  const publicAgent: AgentDefinition = {
    readonly: false,
    accessControl: { scope: AgentAccessControlScope.Public, entries: [] },
    created_by: owner,
    id: 'test-agent-id',
    type: AgentType.chat,
    name: 'test agent',
    description: 'test agent description',
    configuration: {} as AgentConfiguration,
  };

  test('returns false when agent is readonly', () => {
    expect(
      canCurrentUserEditAgent({
        agent: { ...publicAgent, readonly: true },
        manageAgents: true,
        currentUser: otherUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  test('returns false when manageAgents is false', () => {
    expect(
      canCurrentUserEditAgent({
        agent: publicAgent,
        manageAgents: false,
        currentUser: otherUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  test('returns false when isCurrentUserLoading is true', () => {
    expect(
      canCurrentUserEditAgent({
        agent: publicAgent,
        manageAgents: true,
        currentUser: otherUser,
        isAdmin: false,
        isCurrentUserLoading: true,
      })
    ).toBe(false);
  });

  test('returns true for public non-readonly agent when user has manageAgents and write access', () => {
    expect(
      canCurrentUserEditAgent({
        agent: publicAgent,
        manageAgents: true,
        currentUser: otherUser,
        isAdmin: false,
      })
    ).toBe(true);
  });

  test('returns false for private agent when user is not owner', () => {
    expect(
      canCurrentUserEditAgent({
        agent: {
          ...publicAgent,
          accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
        },
        manageAgents: true,
        currentUser: otherUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  test('returns false for shared agent when user is not owner', () => {
    expect(
      canCurrentUserEditAgent({
        agent: {
          ...publicAgent,
          accessControl: { scope: AgentAccessControlScope.Shared, entries: [] },
        },
        manageAgents: true,
        currentUser: otherUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  test('returns true for private agent when current user is owner', () => {
    expect(
      canCurrentUserEditAgent({
        agent: {
          ...publicAgent,
          accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
        },
        manageAgents: true,
        currentUser,
        isAdmin: false,
      })
    ).toBe(true);
  });

  test('returns true for private agent when isAdmin even if not owner', () => {
    expect(
      canCurrentUserEditAgent({
        agent: {
          ...publicAgent,
          accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
        },
        manageAgents: true,
        currentUser: otherUser,
        isAdmin: true,
      })
    ).toBe(true);
  });
});

describe('ACL-aware authorization', () => {
  // Renamed from `owner` to `aliceOwner` to avoid shadowing the module-scope
  // `owner` declared at the top of this file. The ACL-aware suite needs a
  // distinct owner whose username ("alice") is referenced explicitly in tests
  // (e.g. when constructing a matching currentUser), so it can't reuse the
  // outer fixture as-is.
  const aliceOwner: UserIdAndName = { id: 'owner-id', username: 'alice' };
  const bob: CurrentUser = { id: 'bob-id', username: 'bob' };
  const carol: CurrentUser = { id: 'carol-id', username: 'carol' };
  const noOne: CurrentUser = { id: 'no-id', username: 'no-one' };

  describe('getEffectiveAgentRole', () => {
    test('returns "admin" when isAdmin', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: true,
        })
      ).toBe('admin');
    });

    test('returns "owner" for the agent owner', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
          owner: aliceOwner,
          currentUser: { id: 'owner-id', username: 'alice' },
          isAdmin: false,
        })
      ).toBe('owner');
    });

    test('returns undefined for a private agent with no ACL match', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBeUndefined();
    });

    test('matches a user-type ACL entry by username', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: {
            scope: AgentAccessControlScope.Private,
            entries: [{ type: 'user', name: 'bob', role: AgentAccessControlRole.User }],
          },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAccessControlRole.User);
    });

    test('does not match a user-type ACL entry by anything other than username', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: {
            scope: AgentAccessControlScope.Private,
            entries: [{ type: 'user', name: 'analyst', role: AgentAccessControlRole.Manager }],
          },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBeUndefined();
    });

    test('picks the highest role across multiple matching user entries', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: {
            scope: AgentAccessControlScope.Private,
            entries: [
              { type: 'user', name: 'bob', role: AgentAccessControlRole.User },
              { type: 'user', name: 'bob', role: AgentAccessControlRole.Manager },
            ],
          },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAccessControlRole.Manager);
    });

    test('Public access-control scope grants Editor baseline to non-owners', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: { scope: AgentAccessControlScope.Public, entries: [] },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAccessControlRole.Editor);
    });

    test('Shared access-control scope grants User baseline to non-owners', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: { scope: AgentAccessControlScope.Shared, entries: [] },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAccessControlRole.User);
    });

    test('ACL upgrades over access-control scope baseline', () => {
      // Public alone gives Editor; ACL Manager wins.
      expect(
        getEffectiveAgentRole({
          accessControl: {
            scope: AgentAccessControlScope.Public,
            entries: [{ type: 'user', name: 'bob', role: AgentAccessControlRole.Manager }],
          },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAccessControlRole.Manager);
    });

    test('legacy agent (no access-control scope, no ACL) treats as Public Editor', () => {
      expect(
        getEffectiveAgentRole({
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAccessControlRole.Editor);
    });
  });

  describe('hierarchy checks', () => {
    const privateAgent = {
      accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
      owner: aliceOwner,
      isAdmin: false,
    };

    test('User can see, read, and run but not write, delete, or manage ACL', () => {
      // V1 has no Viewer tier — see/read and use share the User threshold.
      const accessControl = {
        scope: AgentAccessControlScope.Private,
        entries: [{ type: 'user' as const, name: 'bob', role: AgentAccessControlRole.User }],
      };
      const args = { ...privateAgent, accessControl, currentUser: bob };
      expect(hasAgentReadAccess(args)).toBe(true);
      expect(hasAgentUseAccess(args)).toBe(true);
      expect(hasAgentWriteAccess(args)).toBe(false);
      expect(canDeleteAgent(args)).toBe(false);
      expect(canManageAgentAccessControl(args)).toBe(false);
    });

    test('no ACL grant on a Private agent denies read and use alike', () => {
      // Replaces the old "Viewer can read but not use" test; with the Viewer tier
      // removed, the only way to deny use is to deny read, and vice versa.
      const args = { ...privateAgent, currentUser: bob };
      expect(hasAgentReadAccess(args)).toBe(false);
      expect(hasAgentUseAccess(args)).toBe(false);
    });

    test('Editor can write and manage ACL but not delete', () => {
      // ACL management is bundled into write access; Editor can edit the ACL.
      // Delete still requires Manager.
      const accessControl = {
        scope: AgentAccessControlScope.Private,
        entries: [{ type: 'user' as const, name: 'bob', role: AgentAccessControlRole.Editor }],
      };
      const args = { ...privateAgent, accessControl, currentUser: bob };
      expect(hasAgentWriteAccess(args)).toBe(true);
      expect(canManageAgentAccessControl(args)).toBe(true);
      expect(canDeleteAgent(args)).toBe(false);
    });

    test('Manager can delete and manage ACL', () => {
      const accessControl = {
        scope: AgentAccessControlScope.Private,
        entries: [{ type: 'user' as const, name: 'bob', role: AgentAccessControlRole.Manager }],
      };
      const args = { ...privateAgent, accessControl, currentUser: bob };
      expect(canDeleteAgent(args)).toBe(true);
      expect(canManageAgentAccessControl(args)).toBe(true);
    });

    test('Public access-control scope does NOT silently grant Manager to all users', () => {
      // ACL Manager is granted to bob; carol gets only the Public baseline (Editor).
      const accessControl = {
        scope: AgentAccessControlScope.Public,
        entries: [{ type: 'user' as const, name: 'bob', role: AgentAccessControlRole.Manager }],
      };
      expect(
        canDeleteAgent({
          owner: aliceOwner,
          accessControl,
          currentUser: carol,
          isAdmin: false,
        })
      ).toBe(false);
    });

    test('owner is implicitly Manager regardless of ACL', () => {
      const args = {
        accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
        owner: aliceOwner,
        currentUser: { id: 'owner-id', username: 'alice' } as CurrentUser,
        isAdmin: false,
      };
      expect(canDeleteAgent(args)).toBe(true);
      expect(canManageAgentAccessControl(args)).toBe(true);
    });

    test('user with no access has no privileges at all', () => {
      const args = { ...privateAgent, currentUser: noOne };
      expect(hasAgentReadAccess(args)).toBe(false);
      expect(hasAgentUseAccess(args)).toBe(false);
      expect(hasAgentWriteAccess(args)).toBe(false);
      expect(canDeleteAgent(args)).toBe(false);
      expect(canManageAgentAccessControl(args)).toBe(false);
    });
  });

  describe('canManageAgentAccessControl', () => {
    // ACL management is bundled into write access on the agent.
    test('grants for the agent owner on a Private agent', () => {
      expect(
        canManageAgentAccessControl({
          accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
          owner: aliceOwner,
          currentUser: { id: 'owner-id', username: 'alice' },
          isAdmin: false,
        })
      ).toBe(true);
    });

    test('denies a non-owner on a Private agent with no ACL grant', () => {
      expect(
        canManageAgentAccessControl({
          accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(false);
    });

    test('grants for an ACL Editor grant on a Private agent', () => {
      expect(
        canManageAgentAccessControl({
          accessControl: {
            scope: AgentAccessControlScope.Private,
            entries: [{ type: 'user', name: 'bob', role: AgentAccessControlRole.Editor }],
          },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(true);
    });

    test('grants for an ACL Manager grant on a Private agent', () => {
      expect(
        canManageAgentAccessControl({
          accessControl: {
            scope: AgentAccessControlScope.Private,
            entries: [{ type: 'user', name: 'bob', role: AgentAccessControlRole.Manager }],
          },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(true);
    });

    test('grants for any non-owner on a Public agent (access-control scope baseline = Editor)', () => {
      expect(
        canManageAgentAccessControl({
          accessControl: { scope: AgentAccessControlScope.Public, entries: [] },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(true);
    });

    test('grants for cluster admin regardless of agent state', () => {
      expect(
        canManageAgentAccessControl({
          accessControl: { scope: AgentAccessControlScope.Private, entries: [] },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: true,
        })
      ).toBe(true);
    });

    test('denies for the default agent regardless of caller, even superuser', () => {
      expect(
        canManageAgentAccessControl({
          agentId: agentBuilderDefaultAgentId,
          accessControl: { scope: AgentAccessControlScope.Public, entries: [] },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: true,
        })
      ).toBe(false);
    });

    test('denies for the default agent even when caller is the owner', () => {
      expect(
        canManageAgentAccessControl({
          agentId: agentBuilderDefaultAgentId,
          accessControl: { scope: AgentAccessControlScope.Public, entries: [] },
          owner: aliceOwner,
          currentUser: { id: 'owner-id', username: 'alice' },
          isAdmin: false,
        })
      ).toBe(false);
    });
  });

  describe('canChangeAgentAccessControlScope', () => {
    test('blocks default agent even for Manager via ACL', () => {
      expect(
        canChangeAgentAccessControlScope({
          agentId: agentBuilderDefaultAgentId,
          accessControl: {
            scope: AgentAccessControlScope.Private,
            entries: [{ type: 'user', name: 'bob', role: AgentAccessControlRole.Manager }],
          },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(false);
    });

    test('allows Manager via ACL on a non-default agent', () => {
      expect(
        canChangeAgentAccessControlScope({
          agentId: 'custom-agent',
          accessControl: {
            scope: AgentAccessControlScope.Private,
            entries: [{ type: 'user', name: 'bob', role: AgentAccessControlRole.Manager }],
          },
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(true);
    });
  });
});
