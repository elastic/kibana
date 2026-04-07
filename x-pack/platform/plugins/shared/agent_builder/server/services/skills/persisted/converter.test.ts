/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillPersistedDefinition } from './client';
import { convertPersistedSkill } from './converter';

describe('convertPersistedSkill', () => {
  const createMockPersistedSkill = (
    overrides: Partial<SkillPersistedDefinition> = {}
  ): SkillPersistedDefinition => ({
    id: 'persisted-skill-1',
    name: 'my-persisted-skill',
    description: 'A persisted skill',
    content: 'Instructions content',
    tool_ids: [],
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-02T00:00:00.000Z',
    referenced_content_count: 0,
    ...overrides,
  });

  it('converts basic fields', () => {
    const skill = createMockPersistedSkill();
    const result = convertPersistedSkill(skill);

    expect(result.id).toBe('persisted-skill-1');
    expect(result.name).toBe('my-persisted-skill');
    expect(result.description).toBe('A persisted skill');
    expect(result.content).toBe('Instructions content');
  });

  it('sets readonly to false for user-created skills', () => {
    const skill = createMockPersistedSkill();
    const result = convertPersistedSkill(skill);

    expect(result.readonly).toBe(false);
    expect(result.plugin_id).toBeUndefined();
  });

  it('sets readonly to true for plugin-managed skills', () => {
    const skill = createMockPersistedSkill({ plugin_id: 'my-plugin' });
    const result = convertPersistedSkill(skill);

    expect(result.readonly).toBe(true);
    expect(result.plugin_id).toBe('my-plugin');
  });

  it('set a default basepath', () => {
    const skill = createMockPersistedSkill();
    const result = convertPersistedSkill(skill);

    expect(result.basePath).toBe('/skills');
  });

  it('does not set getInlineTools', () => {
    const skill = createMockPersistedSkill();
    const result = convertPersistedSkill(skill);

    expect(result.getInlineTools).toBeUndefined();
  });

  it('returns tool_ids from getRegistryTools', () => {
    const skill = createMockPersistedSkill({ tool_ids: ['tool-a', 'tool-b'] });
    const result = convertPersistedSkill(skill);

    expect(result.getRegistryTools()).toEqual(['tool-a', 'tool-b']);
  });

  it('returns empty array from getRegistryTools when tool_ids is empty', () => {
    const skill = createMockPersistedSkill({ tool_ids: [] });
    const result = convertPersistedSkill(skill);

    expect(result.getRegistryTools()).toEqual([]);
  });

  it('converts referenced_content to referencedContent', () => {
    const skill = createMockPersistedSkill({
      referenced_content: [
        { name: 'ref-1', relativePath: '.', content: 'Content 1' },
        { name: 'ref-2', relativePath: './queries', content: 'Content 2' },
      ],
    });
    const result = convertPersistedSkill(skill);

    expect(result.referencedContent).toEqual([
      { name: 'ref-1', relativePath: '.', content: 'Content 1' },
      { name: 'ref-2', relativePath: './queries', content: 'Content 2' },
    ]);
  });

  it('handles undefined referenced_content', () => {
    const skill = createMockPersistedSkill({ referenced_content: undefined });
    const result = convertPersistedSkill(skill);

    expect(result.referencedContent).toBeUndefined();
  });

  it('always sets experimental to false', () => {
    const skill = createMockPersistedSkill();
    const result = convertPersistedSkill(skill);

    expect(result.experimental).toBe(false);
  });

  it('sets experimental to false even for plugin-managed skills', () => {
    const skill = createMockPersistedSkill({ plugin_id: 'my-plugin' });
    const result = convertPersistedSkill(skill);

    expect(result.experimental).toBe(false);
  });
});
