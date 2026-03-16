/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PersistedSkillCreateRequest,
  PersistedSkillUpdateRequest,
} from '@kbn/agent-builder-common';
import type { SkillDocument } from './types';
import type { SkillProperties } from './storage';
import { createAttributes, fromEs, updateDocument } from './converters';

const creationDate = '2024-09-04T06:44:17.944Z';
const updateDate = '2025-08-04T06:44:19.123Z';

describe('fromEs', () => {
  it('converts a skill document to its definition format', () => {
    const document: SkillDocument = {
      _id: '_id',
      _source: {
        id: 'my-skill',
        name: 'My Skill',
        space: 'default',
        description: 'A test skill',
        content: 'Skill content body',
        referenced_content: [{ name: 'ref.md', relativePath: '/ref.md', content: 'ref content' }],
        tool_ids: ['tool-1', 'tool-2'],
        created_at: creationDate,
        updated_at: updateDate,
      },
    };

    const definition = fromEs(document);

    expect(definition).toEqual({
      id: 'my-skill',
      name: 'My Skill',
      description: 'A test skill',
      content: 'Skill content body',
      referenced_content: [{ name: 'ref.md', relativePath: '/ref.md', content: 'ref content' }],
      tool_ids: ['tool-1', 'tool-2'],
      referenced_content_count: 1,
      created_at: creationDate,
      updated_at: updateDate,
    });
  });

  it('throws when source is missing', () => {
    const document: SkillDocument = {
      _id: '_id',
      _source: undefined,
    };

    expect(() => fromEs(document)).toThrow('No source found on skill document');
  });

  it('defaults tool_ids to empty array when undefined', () => {
    const document: SkillDocument = {
      _id: '_id',
      _source: {
        id: 'my-skill',
        name: 'My Skill',
        space: 'default',
        description: 'desc',
        content: 'content',
        tool_ids: undefined as unknown as string[],
        created_at: creationDate,
        updated_at: updateDate,
      },
    };

    const definition = fromEs(document);

    expect(definition.tool_ids).toEqual([]);
  });
});

describe('createAttributes', () => {
  it('converts the creation request to attributes', () => {
    const actualCreationDate = new Date();
    const createRequest: PersistedSkillCreateRequest = {
      id: 'my-skill',
      name: 'My Skill',
      description: 'A test skill',
      content: 'Skill content body',
      tool_ids: ['tool-1'],
    };

    const properties = createAttributes({
      createRequest,
      space: 'some-space',
      creationDate: actualCreationDate,
    });

    expect(properties).toEqual({
      id: 'my-skill',
      name: 'My Skill',
      space: 'some-space',
      description: 'A test skill',
      content: 'Skill content body',
      referenced_content: undefined,
      tool_ids: ['tool-1'],
      created_at: actualCreationDate.toISOString(),
      updated_at: actualCreationDate.toISOString(),
    });
  });

  it('defaults tool_ids to empty array when not provided', () => {
    const createRequest: PersistedSkillCreateRequest = {
      id: 'my-skill',
      name: 'My Skill',
      description: 'desc',
      content: 'content',
      tool_ids: [],
    };

    const properties = createAttributes({
      createRequest,
      space: 'default',
    });

    expect(properties.tool_ids).toEqual([]);
  });

  it('preserves referenced_content when provided', () => {
    const createRequest: PersistedSkillCreateRequest = {
      id: 'my-skill',
      name: 'My Skill',
      description: 'desc',
      content: 'content',
      tool_ids: [],
      referenced_content: [{ name: 'ref.md', relativePath: '/ref.md', content: 'data' }],
    };

    const properties = createAttributes({
      createRequest,
      space: 'default',
    });

    expect(properties.referenced_content).toEqual([
      { name: 'ref.md', relativePath: '/ref.md', content: 'data' },
    ]);
  });
});

describe('updateDocument', () => {
  const currentProps: SkillProperties = {
    id: 'my-skill',
    name: 'Original Name',
    space: 'some-space',
    description: 'Original description',
    content: 'Original content',
    referenced_content: [{ name: 'old.md', relativePath: '/old.md', content: 'old' }],
    tool_ids: ['tool-1'],
    created_at: creationDate,
    updated_at: updateDate,
  };

  it('merges the existing and update attributes', () => {
    const actualUpdateDate = new Date();

    const update: PersistedSkillUpdateRequest = {
      description: 'New description',
      content: 'New content',
    };

    const merged = updateDocument({
      current: currentProps,
      update,
      updateDate: actualUpdateDate,
    });

    expect(merged).toEqual({
      id: 'my-skill',
      name: 'Original Name',
      space: 'some-space',
      description: 'New description',
      content: 'New content',
      referenced_content: [{ name: 'old.md', relativePath: '/old.md', content: 'old' }],
      tool_ids: ['tool-1'],
      created_at: creationDate,
      updated_at: actualUpdateDate.toISOString(),
    });
  });

  it('only updates fields that are explicitly provided', () => {
    const update: PersistedSkillUpdateRequest = {
      name: 'Updated Name',
    };

    const merged = updateDocument({
      current: currentProps,
      update,
    });

    expect(merged.name).toBe('Updated Name');
    expect(merged.description).toBe('Original description');
    expect(merged.content).toBe('Original content');
    expect(merged.tool_ids).toEqual(['tool-1']);
  });

  it('can update tool_ids independently', () => {
    const update: PersistedSkillUpdateRequest = {
      tool_ids: ['tool-2', 'tool-3'],
    };

    const merged = updateDocument({
      current: currentProps,
      update,
    });

    expect(merged.tool_ids).toEqual(['tool-2', 'tool-3']);
    expect(merged.name).toBe('Original Name');
  });

  it('can update referenced_content independently', () => {
    const update: PersistedSkillUpdateRequest = {
      referenced_content: [{ name: 'new.md', relativePath: '/new.md', content: 'new' }],
    };

    const merged = updateDocument({
      current: currentProps,
      update,
    });

    expect(merged.referenced_content).toEqual([
      { name: 'new.md', relativePath: '/new.md', content: 'new' },
    ]);
  });

  it('always updates the updated_at timestamp', () => {
    const actualUpdateDate = new Date('2026-01-01T00:00:00.000Z');
    const update: PersistedSkillUpdateRequest = {};

    const merged = updateDocument({
      current: currentProps,
      update,
      updateDate: actualUpdateDate,
    });

    expect(merged.updated_at).toBe('2026-01-01T00:00:00.000Z');
    expect(merged.created_at).toBe(creationDate);
  });
});
