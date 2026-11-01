/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderDefaultAgentId,
  AgentAccessControlMode,
  AgentAccessControlRole,
  type AgentAccessControlEntry,
  type CurrentUser,
  type UserIdAndName,
} from '@kbn/agent-builder-common';
import {
  canChangeAgentAccessControl,
  canConfigureAgentApprovals,
  canConfigureAgentExecutionIdentity,
  canEditBoundAgent,
  canDeleteAgent,
  getEffectiveAgentRole,
  hasAgentReadAccess,
  hasAgentUseAccess,
  hasAgentWriteAccess,
  isAgentOwner,
  matchesAccessControlEntry,
} from './authorization';

const owner: UserIdAndName = { id: 'owner-id', username: 'alice' };
const ownerUser: CurrentUser = { id: 'owner-id', username: 'alice', isAdmin: false };
const bob: CurrentUser = { id: 'bob-id', username: 'bob', isAdmin: false };
const adminUser: CurrentUser = { id: 'admin-id', username: 'admin', isAdmin: true };

describe('agent access-control authorization', () => {
  describe('isAgentOwner', () => {
    it('matches by stable id', () => {
      expect(isAgentOwner({ owner, currentUser: ownerUser })).toBe(true);
      expect(
        isAgentOwner({
          owner,
          currentUser: { id: 'different-id', username: 'alice' },
        })
      ).toBe(false);
    });

    it('falls back to username for legacy owners that never stored an id', () => {
      expect(
        isAgentOwner({
          owner: { username: 'alice' },
          currentUser: { username: 'alice' },
        })
      ).toBe(true);
      expect(
        isAgentOwner({
          owner: { username: 'alice' },
          currentUser: { id: 'realm:["file","file1","alice"]', username: 'alice' },
        })
      ).toBe(true);
    });

    it('does not fall back to username when the agent document stored an id', () => {
      expect(
        isAgentOwner({
          owner: { id: 'owner-id', username: 'alice' },
          currentUser: { username: 'alice' },
        })
      ).toBe(false);
      expect(
        isAgentOwner({
          owner: { id: 'owner-id', username: 'alice' },
          currentUser: { id: 'different-id', username: 'alice' },
        })
      ).toBe(false);
    });
  });

  describe('matchesAccessControlEntry', () => {
    it('matches an id-backed entry only when the caller carries the same stable id', () => {
      expect(
        matchesAccessControlEntry(
          { type: 'user', id: 'bob-id', role: AgentAccessControlRole.User },
          bob
        )
      ).toBe(true);
      expect(
        matchesAccessControlEntry(
          { type: 'user', id: 'bob-id', role: AgentAccessControlRole.User },
          { username: 'bob' }
        )
      ).toBe(false);
    });

    it('does not fall back to username for id-backed entries (cross-realm case)', () => {
      // Same username, different id: the file-realm and native-realm Bobs must stay distinct.
      expect(
        matchesAccessControlEntry(
          { type: 'user', id: 'bob-id', role: AgentAccessControlRole.User },
          { id: 'realm:["file","file1","bob"]', username: 'bob' }
        )
      ).toBe(false);
    });

    it('ignores name when the entry also carries an id', () => {
      expect(
        matchesAccessControlEntry(
          { type: 'user', id: 'other-id', name: 'bob', role: AgentAccessControlRole.User },
          bob
        )
      ).toBe(false);
    });

    it('matches a legacy name-only entry by username', () => {
      expect(
        matchesAccessControlEntry(
          { type: 'user', name: 'bob', role: AgentAccessControlRole.User },
          bob
        )
      ).toBe(true);
      expect(
        matchesAccessControlEntry(
          { type: 'user', name: 'bob', role: AgentAccessControlRole.User },
          { id: 'other-id', username: 'other' }
        )
      ).toBe(false);
    });

    it('returns false when the entry is not a user grant', () => {
      const roleEntry = {
        type: 'role',
        id: 'bob-id',
        role: AgentAccessControlRole.User,
      } as unknown as AgentAccessControlEntry;

      expect(matchesAccessControlEntry(roleEntry, bob)).toBe(false);
    });
  });

  describe('getEffectiveAgentRole', () => {
    it('returns admin and owner roles before ACL grants', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: { access_mode: AgentAccessControlMode.Private, entries: [] },
          owner,
          currentUser: adminUser,
        })
      ).toBe('admin');

      expect(
        getEffectiveAgentRole({
          accessControl: { access_mode: AgentAccessControlMode.Private, entries: [] },
          owner,
          currentUser: ownerUser,
        })
      ).toBe('owner');
    });

    it('uses id-backed ACL grants for non-owners', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: {
            access_mode: AgentAccessControlMode.Private,
            entries: [{ type: 'user', id: 'bob-id', role: AgentAccessControlRole.Manager }],
          },
          owner,
          currentUser: bob,
        })
      ).toBe(AgentAccessControlRole.Manager);

      expect(
        getEffectiveAgentRole({
          accessControl: { access_mode: AgentAccessControlMode.Public, entries: [] },
          owner,
          currentUser: bob,
        })
      ).toBe(AgentAccessControlRole.Editor);
    });

    it('matches legacy name-only ACL entries by username', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: {
            access_mode: AgentAccessControlMode.Private,
            entries: [{ type: 'user', name: 'bob', role: AgentAccessControlRole.Manager }],
          },
          owner,
          currentUser: bob,
        })
      ).toBe(AgentAccessControlRole.Manager);
    });

    it('does not grant access when an id-backed entry has a different id despite matching username', () => {
      expect(
        getEffectiveAgentRole({
          accessControl: {
            access_mode: AgentAccessControlMode.Private,
            entries: [{ type: 'user', id: 'other-bob-id', role: AgentAccessControlRole.Manager }],
          },
          owner,
          currentUser: bob,
        })
      ).toBeUndefined();
    });

    it('treats a missing access control as public so built-in agents stay usable', () => {
      const args = { accessControl: undefined, owner, currentUser: bob };

      expect(getEffectiveAgentRole(args)).toBe(AgentAccessControlRole.Editor);
      expect(hasAgentReadAccess(args)).toBe(true);
      expect(hasAgentUseAccess(args)).toBe(true);
    });
  });

  describe('hierarchy checks', () => {
    it('lets Editor write but not delete or manage access control', () => {
      const args = {
        accessControl: {
          access_mode: AgentAccessControlMode.Private,
          entries: [{ type: 'user' as const, id: 'bob-id', role: AgentAccessControlRole.Editor }],
        },
        owner,
        currentUser: bob,
      };

      expect(hasAgentReadAccess(args)).toBe(true);
      expect(hasAgentUseAccess(args)).toBe(true);
      expect(hasAgentWriteAccess(args)).toBe(true);
      expect(canDeleteAgent(args)).toBe(false);
      expect(canChangeAgentAccessControl(args)).toBe(false);
    });

    it('lets Manager delete and manage access control', () => {
      const args = {
        accessControl: {
          access_mode: AgentAccessControlMode.Private,
          entries: [{ type: 'user' as const, id: 'bob-id', role: AgentAccessControlRole.Manager }],
        },
        owner,
        currentUser: bob,
      };

      expect(canDeleteAgent(args)).toBe(true);
      expect(canChangeAgentAccessControl(args)).toBe(true);
    });

    it('blocks access-control changes for the default agent', () => {
      expect(
        canChangeAgentAccessControl({
          agentId: agentBuilderDefaultAgentId,
          accessControl: {
            access_mode: AgentAccessControlMode.Private,
            entries: [{ type: 'user', id: 'bob-id', role: AgentAccessControlRole.Manager }],
          },
          owner,
          currentUser: bob,
        })
      ).toBe(false);
    });
  });

  describe('canConfigureAgentApprovals', () => {
    const accessControlFor = (role: AgentAccessControlRole) => ({
      access_mode: AgentAccessControlMode.Public,
      entries: [{ type: 'user' as const, id: 'bob-id', role }],
    });

    it.each([
      { caller: 'an admin', currentUser: adminUser, role: undefined, expected: true },
      { caller: 'the owner', currentUser: ownerUser, role: undefined, expected: true },
      {
        caller: 'a Manager',
        currentUser: bob,
        role: AgentAccessControlRole.Manager,
        expected: true,
      },
      {
        caller: 'an Editor',
        currentUser: bob,
        role: AgentAccessControlRole.Editor,
        expected: false,
      },
      { caller: 'a User', currentUser: bob, role: AgentAccessControlRole.User, expected: false },
    ])('returns $expected for $caller', ({ currentUser, role, expected }) => {
      expect(
        canConfigureAgentApprovals({
          agentId: 'agent-1',
          accessControl: role ? accessControlFor(role) : undefined,
          owner,
          currentUser,
        })
      ).toBe(expected);
    });

    it.each([
      { caller: 'an admin', currentUser: adminUser, expected: true },
      { caller: 'the owner', currentUser: ownerUser, expected: false },
      { caller: 'a Manager', currentUser: bob, expected: false },
    ])('returns $expected for $caller on the default agent', ({ currentUser, expected }) => {
      expect(
        canConfigureAgentApprovals({
          agentId: agentBuilderDefaultAgentId,
          accessControl: accessControlFor(AgentAccessControlRole.Manager),
          owner,
          currentUser,
        })
      ).toBe(expected);
    });
  });
});

describe('bound service accounts', () => {
  const privateAccess = { access_mode: AgentAccessControlMode.Private, entries: [] };

  describe('canConfigureAgentExecutionIdentity', () => {
    it('requires write access and manage_security, and never the default agent', () => {
      const securityOwner = { ...ownerUser, canManageSecurity: true };
      expect(
        canConfigureAgentExecutionIdentity({ owner, currentUser: securityOwner, agentId: 'a' })
      ).toBe(true);
      expect(
        canConfigureAgentExecutionIdentity({ owner, currentUser: ownerUser, agentId: 'a' })
      ).toBe(false);
      expect(
        canConfigureAgentExecutionIdentity({
          accessControl: privateAccess,
          owner,
          currentUser: { ...bob, canManageSecurity: true },
          agentId: 'a',
        })
      ).toBe(false);
      expect(
        canConfigureAgentExecutionIdentity({
          owner,
          currentUser: { ...adminUser, canManageSecurity: true },
          agentId: agentBuilderDefaultAgentId,
        })
      ).toBe(false);
    });
  });

  describe('canEditBoundAgent', () => {
    it('is unrestricted on an unbound agent', () => {
      expect(canEditBoundAgent({ currentUser: ownerUser })).toBe(true);
    });

    it('needs manage_security on a bound agent, even for the owner', () => {
      expect(
        canEditBoundAgent({ currentUser: ownerUser, boundServiceAccountId: 'kibana/sa-1' })
      ).toBe(false);
      expect(
        canEditBoundAgent({
          currentUser: { ...ownerUser, canManageSecurity: true },
          boundServiceAccountId: 'kibana/sa-1',
        })
      ).toBe(true);
    });
  });
});
