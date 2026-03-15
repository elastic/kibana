/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAgentOwner,
  canChangeAgentVisibility,
  hasAgentReadAccess,
  hasAgentWriteAccess,
} from './access_control';
import { agentBuilderDefaultAgentId } from './definition';
import { AgentVisibility } from './visibility';
import type { UserIdAndName } from '../base/users';

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
