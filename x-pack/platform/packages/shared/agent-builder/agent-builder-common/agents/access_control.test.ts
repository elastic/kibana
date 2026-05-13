/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAgentOwner,
  canChangeAgentVisibility,
  canDeleteAgent,
  canManageAgentAcl,
  getEffectiveAgentRole,
  hasAgentReadAccess,
  hasAgentUseAccess,
  hasAgentWriteAccess,
  canCurrentUserEditAgent,
} from './access_control';
import type { AgentConfiguration, AgentDefinition } from './definition';
import { agentBuilderDefaultAgentId, AgentType } from './definition';
import { AgentVisibility } from './visibility';
import { AgentAclRole, type AgentAcl } from './acl';
import type { CurrentUser, UserIdAndName } from '../base/users';

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

describe('canChangeAgentVisibility', () => {
  test('returns true when isAdmin is true', () => {
    expect(
      canChangeAgentVisibility({
        owner,
        currentUser: otherUser,
        isAdmin: true,
      })
    ).toBe(true);
  });

  test('returns false when override is false and current user is not owner', () => {
    expect(
      canChangeAgentVisibility({
        owner,
        currentUser: otherUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  test('returns true when override is false but current user is owner (by id)', () => {
    expect(
      canChangeAgentVisibility({
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
      canChangeAgentVisibility({
        owner: ownerByUsername,
        currentUser: userByUsername,
        isAdmin: false,
      })
    ).toBe(true);
  });

  test('returns false for the default agent even when user is owner', () => {
    expect(
      canChangeAgentVisibility({
        agentId: agentBuilderDefaultAgentId,
        owner,
        currentUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  test('returns false for the default agent even with visibility access override', () => {
    expect(
      canChangeAgentVisibility({
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
        visibility: AgentVisibility.Private,
        isAdmin: true,
      })
    ).toBe(true);
  });

  test('returns true when current user is owner', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        visibility: AgentVisibility.Private,
        currentUser,
      })
    ).toBe(true);
  });

  test('returns true when visibility is Public', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        visibility: AgentVisibility.Public,
      })
    ).toBe(true);
  });

  test('returns true when visibility is Shared', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        visibility: AgentVisibility.Shared,
      })
    ).toBe(true);
  });

  test('returns false when visibility is Private and user is not owner and no override', () => {
    expect(
      hasAgentReadAccess({
        ...baseArgs,
        visibility: AgentVisibility.Private,
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
        visibility: AgentVisibility.Private,
        isAdmin: true,
      })
    ).toBe(true);
  });

  test('returns true when current user is owner', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        visibility: AgentVisibility.Private,
        currentUser,
      })
    ).toBe(true);
  });

  test('returns true when visibility is Public', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        visibility: AgentVisibility.Public,
      })
    ).toBe(true);
  });

  test('returns false when visibility is Shared and user is not owner', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        visibility: AgentVisibility.Shared,
      })
    ).toBe(false);
  });

  test('returns false when visibility is Private and user is not owner', () => {
    expect(
      hasAgentWriteAccess({
        ...baseArgs,
        visibility: AgentVisibility.Private,
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
    visibility: AgentVisibility.Public,
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
        agent: { ...publicAgent, visibility: AgentVisibility.Private },
        manageAgents: true,
        currentUser: otherUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  test('returns false for shared agent when user is not owner', () => {
    expect(
      canCurrentUserEditAgent({
        agent: { ...publicAgent, visibility: AgentVisibility.Shared },
        manageAgents: true,
        currentUser: otherUser,
        isAdmin: false,
      })
    ).toBe(false);
  });

  test('returns true for private agent when current user is owner', () => {
    expect(
      canCurrentUserEditAgent({
        agent: { ...publicAgent, visibility: AgentVisibility.Private },
        manageAgents: true,
        currentUser,
        isAdmin: false,
      })
    ).toBe(true);
  });

  test('returns true for private agent when isAdmin even if not owner', () => {
    expect(
      canCurrentUserEditAgent({
        agent: { ...publicAgent, visibility: AgentVisibility.Private },
        manageAgents: true,
        currentUser: otherUser,
        isAdmin: true,
      })
    ).toBe(true);
  });
});

describe('ACL-aware authorization', () => {
  const owner: UserIdAndName = { id: 'owner-id', username: 'alice' };
  const bob: CurrentUser = { id: 'bob-id', username: 'bob', roles: ['analyst'] };
  const carol: CurrentUser = { id: 'carol-id', username: 'carol', roles: ['viewer_role'] };
  const noOne: CurrentUser = { id: 'no-id', username: 'no-one', roles: [] };

  const aclWith = (...entries: AgentAcl['entries']): AgentAcl => ({ entries, version: 0 });

  describe('getEffectiveAgentRole', () => {
    test('returns "admin" when isAdmin', () => {
      expect(
        getEffectiveAgentRole({
          visibility: AgentVisibility.Private,
          owner,
          currentUser: bob,
          isAdmin: true,
        })
      ).toBe('admin');
    });

    test('returns "owner" for the agent owner', () => {
      expect(
        getEffectiveAgentRole({
          visibility: AgentVisibility.Private,
          owner,
          currentUser: { id: 'owner-id', username: 'alice' },
          isAdmin: false,
        })
      ).toBe('owner');
    });

    test('returns undefined for a private agent with no ACL match', () => {
      expect(
        getEffectiveAgentRole({
          visibility: AgentVisibility.Private,
          owner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBeUndefined();
    });

    test('matches a user-type ACL entry by username', () => {
      expect(
        getEffectiveAgentRole({
          visibility: AgentVisibility.Private,
          owner,
          acl: aclWith({ type: 'user', name: 'bob', role: AgentAclRole.User }),
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAclRole.User);
    });

    test('does not match a user-type ACL entry against the user roles list', () => {
      expect(
        getEffectiveAgentRole({
          visibility: AgentVisibility.Private,
          owner,
          // type=user but the value is "analyst" — must not cross-match against bob.roles=['analyst'].
          acl: aclWith({ type: 'user', name: 'analyst', role: AgentAclRole.Manager }),
          currentUser: bob,
          isAdmin: false,
        })
      ).toBeUndefined();
    });

    test('picks the highest role across multiple matching user entries', () => {
      expect(
        getEffectiveAgentRole({
          visibility: AgentVisibility.Private,
          owner,
          acl: aclWith(
            { type: 'user', name: 'bob', role: AgentAclRole.User },
            { type: 'user', name: 'bob', role: AgentAclRole.Manager }
          ),
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAclRole.Manager);
    });

    test('Public visibility grants Editor baseline to non-owners', () => {
      expect(
        getEffectiveAgentRole({
          visibility: AgentVisibility.Public,
          owner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAclRole.Editor);
    });

    test('Shared visibility grants User baseline to non-owners', () => {
      expect(
        getEffectiveAgentRole({
          visibility: AgentVisibility.Shared,
          owner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAclRole.User);
    });

    test('ACL upgrades over visibility baseline', () => {
      // Public alone gives Editor; ACL Manager wins.
      expect(
        getEffectiveAgentRole({
          visibility: AgentVisibility.Public,
          owner,
          acl: aclWith({ type: 'user', name: 'bob', role: AgentAclRole.Manager }),
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAclRole.Manager);
    });

    test('legacy agent (no visibility, no ACL) treats as Public Editor', () => {
      expect(
        getEffectiveAgentRole({
          owner,
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(AgentAclRole.Editor);
    });
  });

  describe('hierarchy checks', () => {
    const privateAgent = {
      visibility: AgentVisibility.Private,
      owner,
      isAdmin: false,
    };

    test('User can see, read, and run but not write, delete, or manage ACL', () => {
      // V1 has no Viewer tier — see/read and use share the User threshold.
      const acl = aclWith({ type: 'user', name: 'bob', role: AgentAclRole.User });
      const args = { ...privateAgent, acl, currentUser: bob };
      expect(hasAgentReadAccess(args)).toBe(true);
      expect(hasAgentUseAccess(args)).toBe(true);
      expect(hasAgentWriteAccess(args)).toBe(false);
      expect(canDeleteAgent(args)).toBe(false);
      expect(canManageAgentAcl(args)).toBe(false);
    });

    test('no ACL grant on a Private agent denies read and use alike', () => {
      // Replaces the old "Viewer can read but not use" test; with the Viewer tier
      // removed, the only way to deny use is to deny read, and vice versa.
      const args = { ...privateAgent, currentUser: bob };
      expect(hasAgentReadAccess(args)).toBe(false);
      expect(hasAgentUseAccess(args)).toBe(false);
    });

    test('Editor can write but not delete or manage ACL', () => {
      const acl = aclWith({ type: 'user', name: 'bob', role: AgentAclRole.Editor });
      const args = { ...privateAgent, acl, currentUser: bob };
      expect(hasAgentWriteAccess(args)).toBe(true);
      expect(canDeleteAgent(args)).toBe(false);
      expect(canManageAgentAcl(args)).toBe(false);
    });

    test('Manager can delete and manage ACL', () => {
      const acl = aclWith({ type: 'user', name: 'bob', role: AgentAclRole.Manager });
      const args = { ...privateAgent, acl, currentUser: bob };
      expect(canDeleteAgent(args)).toBe(true);
      expect(canManageAgentAcl(args)).toBe(true);
    });

    test('Public visibility does NOT silently grant Manager to all users', () => {
      // ACL Manager is granted to bob; carol gets only the Public baseline (Editor).
      const acl = aclWith({ type: 'user', name: 'bob', role: AgentAclRole.Manager });
      expect(
        canDeleteAgent({
          visibility: AgentVisibility.Public,
          owner,
          acl,
          currentUser: carol,
          isAdmin: false,
        })
      ).toBe(false);
    });

    test('owner is implicitly Manager regardless of ACL', () => {
      const args = {
        visibility: AgentVisibility.Private,
        owner,
        currentUser: { id: 'owner-id', username: 'alice' } as CurrentUser,
        isAdmin: false,
      };
      expect(canDeleteAgent(args)).toBe(true);
      expect(canManageAgentAcl(args)).toBe(true);
    });

    test('user with no access has no privileges at all', () => {
      const args = { ...privateAgent, currentUser: noOne };
      expect(hasAgentReadAccess(args)).toBe(false);
      expect(hasAgentUseAccess(args)).toBe(false);
      expect(hasAgentWriteAccess(args)).toBe(false);
      expect(canDeleteAgent(args)).toBe(false);
      expect(canManageAgentAcl(args)).toBe(false);
    });
  });

  describe('canManageAgentAcl', () => {
    test('grants when manageAcls privilege is held', () => {
      expect(
        canManageAgentAcl({
          visibility: AgentVisibility.Private,
          owner,
          currentUser: bob,
          isAdmin: false,
          manageAcls: true,
        })
      ).toBe(true);
    });

    test('denies when manageAcls is false and no ownership/admin/Manager role', () => {
      expect(
        canManageAgentAcl({
          visibility: AgentVisibility.Private,
          owner,
          currentUser: bob,
          isAdmin: false,
          manageAcls: false,
        })
      ).toBe(false);
    });

    test('grants for ACL Manager grant', () => {
      expect(
        canManageAgentAcl({
          visibility: AgentVisibility.Private,
          owner,
          acl: aclWith({ type: 'user', name: 'bob', role: AgentAclRole.Manager }),
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(true);
    });

    test('denies for the default agent regardless of caller, even superuser', () => {
      expect(
        canManageAgentAcl({
          agentId: agentBuilderDefaultAgentId,
          visibility: AgentVisibility.Public,
          owner,
          currentUser: bob,
          isAdmin: true,
          manageAcls: true,
        })
      ).toBe(false);
    });

    test('denies for the default agent even when caller is the owner', () => {
      expect(
        canManageAgentAcl({
          agentId: agentBuilderDefaultAgentId,
          visibility: AgentVisibility.Public,
          owner,
          currentUser: { id: 'owner-id', username: 'alice' },
          isAdmin: false,
        })
      ).toBe(false);
    });
  });

  describe('canChangeAgentVisibility', () => {
    test('blocks default agent even for Manager via ACL', () => {
      expect(
        canChangeAgentVisibility({
          agentId: agentBuilderDefaultAgentId,
          visibility: AgentVisibility.Private,
          owner,
          acl: aclWith({ type: 'user', name: 'bob', role: AgentAclRole.Manager }),
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(false);
    });

    test('allows Manager via ACL on a non-default agent', () => {
      expect(
        canChangeAgentVisibility({
          agentId: 'custom-agent',
          visibility: AgentVisibility.Private,
          owner,
          acl: aclWith({ type: 'user', name: 'bob', role: AgentAclRole.Manager }),
          currentUser: bob,
          isAdmin: false,
        })
      ).toBe(true);
    });
  });
});
