/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAgentOwner,
  canChangeAgentAccessControl,
  canDeleteAgent,
  canManageAgentAccessControl,
  getEffectiveAgentRole,
  hasAgentReadAccess,
  hasAgentUseAccess,
  hasAgentWriteAccess,
  canCurrentUserEditAgent,
} from './access_control';
import type { AgentConfiguration, AgentDefinition } from './definition';
import { agentBuilderDefaultAgentId, AgentType } from './definition';
import { AgentAccessControlScope } from './visibility';
import { AgentAccessControlRole, type AgentAccessControl } from './acl';
import type { CurrentUser, UserIdAndName } from '../base/users';

const owner: UserIdAndName = { id: 'owner-id', username: 'owner-user' };
const currentUser: UserIdAndName = { id: 'owner-id', username: 'owner-user' };
const otherUser: UserIdAndName = { id: 'other-id', username: 'other-user' };

const accessControlWith = (
  scope: AgentAccessControlScope,
  ...entries: AgentAccessControl['entries']
): AgentAccessControl => ({ scope, entries });

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

describe('canChangeAgentAccessControl', () => {
  test('returns true when isAdmin is true', () => {
    expect(
      canChangeAgentAccessControl({
        owner,
        currentUser: otherUser,
        isAdmin: true,
      })
    ).toBe(true);
  });

  test('returns false when override is false and current user is not owner', () => {
    expect(
      canChangeAgentAccessControl({
        owner,
        currentUser: otherUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  test('returns true when override is false but current user is owner (by id)', () => {
    expect(
      canChangeAgentAccessControl({
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
      canChangeAgentAccessControl({
        owner: ownerByUsername,
        currentUser: userByUsername,
        isAdmin: false,
      })
    ).toBe(true);
  });

  test('returns false for the default agent even when user is owner', () => {
    expect(
      canChangeAgentAccessControl({
        agentId: agentBuilderDefaultAgentId,
        owner,
        currentUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  test('returns false for the default agent even with visibility access override', () => {
    expect(
      canChangeAgentAccessControl({
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
        accessControl: accessControlWith(AgentAccessControlScope.Private),
        isAdmin: true,
      })
    ).toBe(true);
  });

  test('returns true when current user is owner', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        accessControl: accessControlWith(AgentAccessControlScope.Private),
        currentUser,
      })
    ).toBe(true);
  });

  test('returns true when visibility is Public', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        accessControl: accessControlWith(AgentAccessControlScope.Public),
      })
    ).toBe(true);
  });

  test('returns true when visibility is Shared', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        accessControl: accessControlWith(AgentAccessControlScope.Shared),
      })
    ).toBe(true);
  });

  test('returns false when visibility is Private and user is not owner and no override', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        accessControl: accessControlWith(AgentAccessControlScope.Private),
      })
    ).toBe(false);
  });

  test('when visibility is undefined (legacy agent), treats as Public so any user can read', () => {
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
        accessControl: accessControlWith(AgentAccessControlScope.Private),
        isAdmin: true,
      })
    ).toBe(true);
  });

  test('returns true when current user is owner', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        accessControl: accessControlWith(AgentAccessControlScope.Private),
        currentUser,
      })
    ).toBe(true);
  });

  test('returns true when visibility is Public', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        accessControl: accessControlWith(AgentAccessControlScope.Public),
      })
    ).toBe(true);
  });

  test('returns false when visibility is Shared and user is not owner', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        accessControl: accessControlWith(AgentAccessControlScope.Shared),
      })
    ).toBe(false);
  });

  test('returns false when visibility is Private and user is not owner', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        accessControl: accessControlWith(AgentAccessControlScope.Private),
      })
    ).toBe(false);
  });

  test('when visibility is undefined (legacy agent), treats as Public so any user can write', () => {
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
    accessControl: accessControlWith(AgentAccessControlScope.Public),
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
          accessControl: accessControlWith(AgentAccessControlScope.Private),
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
        agent: { ...publicAgent, accessControl: accessControlWith(AgentAccessControlScope.Shared) },
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
          accessControl: accessControlWith(AgentAccessControlScope.Private),
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
          accessControl: accessControlWith(AgentAccessControlScope.Private),
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
          accessControl: accessControlWith(AgentAccessControlScope.Private),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: true,
        })
      ).toBe('admin');
    });

    test('returns "owner" for the agent owner', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: accessControlWith(AgentAccessControlScope.Private),
          owner: aliceOwner,
          currentUser: { id: 'owner-id', username: 'alice' },
          isAdmin: false,
        })
      ).toBe('owner');
    });

    test('returns undefined for a private agent with no ACL match', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: accessControlWith(AgentAccessControlScope.Private),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBeUndefined();
    });

    test('matches a user-type ACL entry by username', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: accessControlWith(AgentAccessControlScope.Private, {
            type: 'user',
            name: 'bob',
            role: AgentAccessControlRole.User,
          }),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAccessControlRole.User);
    });

    test('does not match a user-type ACL entry by anything other than username', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: accessControlWith(AgentAccessControlScope.Private, {
            type: 'user',
            name: 'analyst',
            role: AgentAccessControlRole.Manager,
          }),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBeUndefined();
    });

    test('picks the highest role across multiple matching user entries', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: accessControlWith(
            AgentAccessControlScope.Private,
            { type: 'user', name: 'bob', role: AgentAccessControlRole.User },
            { type: 'user', name: 'bob', role: AgentAccessControlRole.Manager }
          ),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAccessControlRole.Manager);
    });

    test('Public visibility grants Editor baseline to non-owners', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: accessControlWith(AgentAccessControlScope.Public),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAccessControlRole.Editor);
    });

    test('Shared visibility grants User baseline to non-owners', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: accessControlWith(AgentAccessControlScope.Shared),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAccessControlRole.User);
    });

    test('ACL upgrades over visibility baseline', () => {
      // Public alone gives Editor; ACL Manager wins.
      expect(
        getEffectiveAgentRole({
          accessControl: accessControlWith(AgentAccessControlScope.Public, {
            type: 'user',
            name: 'bob',
            role: AgentAccessControlRole.Manager,
          }),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAccessControlRole.Manager);
    });

    test('legacy agent (no visibility, no ACL) treats as Public Editor', () => {
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
      accessControl: accessControlWith(AgentAccessControlScope.Private),
      owner: aliceOwner,
      isAdmin: false,
    };

    test('User can see, read, and run but not write, delete, or manage ACL', () => {
      // V1 has no Viewer tier — see/read and use share the User threshold.
      const accessControl = accessControlWith(AgentAccessControlScope.Private, {
        type: 'user',
        name: 'bob',
        role: AgentAccessControlRole.User,
      });
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
      const accessControl = accessControlWith(AgentAccessControlScope.Private, {
        type: 'user',
        name: 'bob',
        role: AgentAccessControlRole.Editor,
      });
      const args = { ...privateAgent, accessControl, currentUser: bob };
      expect(hasAgentWriteAccess(args)).toBe(true);
      expect(canManageAgentAccessControl(args)).toBe(true);
      expect(canDeleteAgent(args)).toBe(false);
    });

    test('Manager can delete and manage ACL', () => {
      const accessControl = accessControlWith(AgentAccessControlScope.Private, {
        type: 'user',
        name: 'bob',
        role: AgentAccessControlRole.Manager,
      });
      const args = { ...privateAgent, accessControl, currentUser: bob };
      expect(canDeleteAgent(args)).toBe(true);
      expect(canManageAgentAccessControl(args)).toBe(true);
    });

    test('Public visibility does NOT silently grant Manager to all users', () => {
      // ACL Manager is granted to bob; carol gets only the Public baseline (Editor).
      const accessControl = accessControlWith(AgentAccessControlScope.Public, {
        type: 'user',
        name: 'bob',
        role: AgentAccessControlRole.Manager,
      });
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
        accessControl: accessControlWith(AgentAccessControlScope.Private),
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
          accessControl: accessControlWith(AgentAccessControlScope.Private),
          owner: aliceOwner,
          currentUser: { id: 'owner-id', username: 'alice' },
          isAdmin: false,
        })
      ).toBe(true);
    });

    test('denies a non-owner on a Private agent with no ACL grant', () => {
      expect(
        canManageAgentAccessControl({
          accessControl: accessControlWith(AgentAccessControlScope.Private),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(false);
    });

    test('grants for an ACL Editor grant on a Private agent', () => {
      expect(
        canManageAgentAccessControl({
          accessControl: accessControlWith(AgentAccessControlScope.Private, {
            type: 'user',
            name: 'bob',
            role: AgentAccessControlRole.Editor,
          }),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(true);
    });

    test('grants for an ACL Manager grant on a Private agent', () => {
      expect(
        canManageAgentAccessControl({
          accessControl: accessControlWith(AgentAccessControlScope.Private, {
            type: 'user',
            name: 'bob',
            role: AgentAccessControlRole.Manager,
          }),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(true);
    });

    test('grants for any non-owner on a Public agent (visibility baseline = Editor)', () => {
      expect(
        canManageAgentAccessControl({
          accessControl: accessControlWith(AgentAccessControlScope.Public),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(true);
    });

    test('grants for cluster admin regardless of agent state', () => {
      expect(
        canManageAgentAccessControl({
          accessControl: accessControlWith(AgentAccessControlScope.Private),
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
          accessControl: accessControlWith(AgentAccessControlScope.Public),
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
          accessControl: accessControlWith(AgentAccessControlScope.Public),
          owner: aliceOwner,
          currentUser: { id: 'owner-id', username: 'alice' },
          isAdmin: false,
        })
      ).toBe(false);
    });
  });

  describe('canChangeAgentAccessControl', () => {
    test('blocks default agent even for Manager via ACL', () => {
      expect(
        canChangeAgentAccessControl({
          agentId: agentBuilderDefaultAgentId,
          accessControl: accessControlWith(AgentAccessControlScope.Private, {
            type: 'user',
            name: 'bob',
            role: AgentAccessControlRole.Manager,
          }),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(false);
    });

    test('allows Manager via ACL on a non-default agent', () => {
      expect(
        canChangeAgentAccessControl({
          agentId: 'custom-agent',
          accessControl: accessControlWith(AgentAccessControlScope.Private, {
            type: 'user',
            name: 'bob',
            role: AgentAccessControlRole.Manager,
          }),
          owner: aliceOwner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(true);
    });
  });
});
