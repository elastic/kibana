/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId, AgentType, AgentVisibility } from '@kbn/agent-builder-common';
import type { AgentProperties } from '../storage';
import {
  hasReadAccess,
  hasWriteAccess,
  buildVisibilityReadFilter,
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
  it('includes owner username clause and must_not private visibility', () => {
    const filter = buildVisibilityReadFilter({ user: ownerUser });
    expect(filter).toEqual({
      bool: {
        should: [
          { bool: { must_not: { term: { visibility: AgentVisibility.Private } } } },
          { term: { created_by_name: 'owner' } },
          { term: { created_by_id: 'user-1' } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('omits created_by_id clause when user.id is undefined', () => {
    const filter = buildVisibilityReadFilter({ user: ownerByUsernameOnly });
    expect(filter.bool.should).toHaveLength(2);
    expect(filter.bool.should).toEqual([
      { bool: { must_not: { term: { visibility: AgentVisibility.Private } } } },
      { term: { created_by_name: 'owner' } },
    ]);
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
