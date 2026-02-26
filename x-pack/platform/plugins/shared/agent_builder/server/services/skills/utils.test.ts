/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { internalToPublicDefinition } from './utils';

describe('internalToPublicDefinition', () => {
  const createMockInternalSkill = (
    overrides: Partial<InternalSkillDefinition> = {}
  ): InternalSkillDefinition => ({
    id: 'test-skill',
    name: 'test-skill-name',
    description: 'A test skill',
    content: 'Skill content',
    readonly: true,
    getRegistryTools: () => [],
    ...overrides,
  });

  it('converts basic fields', async () => {
    const skill = createMockInternalSkill();
    const result = await internalToPublicDefinition(skill);

    expect(result.id).toBe('test-skill');
    expect(result.name).toBe('test-skill-name');
    expect(result.description).toBe('A test skill');
    expect(result.content).toBe('Skill content');
  });

  it('preserves readonly flag for builtin skills', async () => {
    const skill = createMockInternalSkill({ readonly: true });
    const result = await internalToPublicDefinition(skill);

    expect(result.readonly).toBe(true);
  });

  it('preserves readonly flag for persisted skills', async () => {
    const skill = createMockInternalSkill({ readonly: false });
    const result = await internalToPublicDefinition(skill);

    expect(result.readonly).toBe(false);
  });

  it('converts referencedContent to referenced_content', async () => {
    const skill = createMockInternalSkill({
      referencedContent: [
        { name: 'ref-1', relativePath: '.', content: 'Content 1' },
        { name: 'ref-2', relativePath: './queries', content: 'Content 2' },
      ],
    });
    const result = await internalToPublicDefinition(skill);

    expect(result.referenced_content).toEqual([
      { name: 'ref-1', relativePath: '.', content: 'Content 1' },
      { name: 'ref-2', relativePath: './queries', content: 'Content 2' },
    ]);
  });

  it('handles undefined referencedContent', async () => {
    const skill = createMockInternalSkill({ referencedContent: undefined });
    const result = await internalToPublicDefinition(skill);

    expect(result.referenced_content).toBeUndefined();
  });

  it('converts getRegistryTools to tool_ids', async () => {
    const skill = createMockInternalSkill({
      getRegistryTools: () => ['tool-a', 'tool-b'],
    });
    const result = await internalToPublicDefinition(skill);

    expect(result.tool_ids).toEqual(['tool-a', 'tool-b']);
  });

  it('returns empty tool_ids when getRegistryTools returns empty array', async () => {
    const skill = createMockInternalSkill({
      getRegistryTools: () => [],
    });
    const result = await internalToPublicDefinition(skill);

    expect(result.tool_ids).toEqual([]);
  });

  it('does not include basePath or getInlineTools in the public definition', async () => {
    const skill = createMockInternalSkill({
      basePath: 'skills/platform',
      getInlineTools: jest.fn(),
    });
    const result = await internalToPublicDefinition(skill);

    expect(result).not.toHaveProperty('basePath');
    expect(result).not.toHaveProperty('getInlineTools');
    expect(result).not.toHaveProperty('getRegistryTools');
  });
});
