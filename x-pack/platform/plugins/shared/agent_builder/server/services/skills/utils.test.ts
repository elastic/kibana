/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { internalToPublicDefinition, resolveSkill } from './utils';

describe('internalToPublicDefinition', () => {
  const createMockInternalSkill = (
    overrides: Partial<InternalSkillDefinition> = {}
  ): InternalSkillDefinition => ({
    id: 'test-skill',
    name: 'test-skill-name',
    description: 'A test skill',
    content: 'Skill content',
    readonly: true,
    basePath: 'skills/platform',
    getRegistryTools: () => [],
    experimental: false,
    ...overrides,
    referencedContentCount: overrides.referencedContentCount ?? 0,
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

  it('includes plugin_id when present', async () => {
    const skill = createMockInternalSkill({ plugin_id: 'my-plugin' });
    const result = await internalToPublicDefinition(skill);

    expect(result.plugin_id).toBe('my-plugin');
  });

  it('does not include plugin_id when absent', async () => {
    const skill = createMockInternalSkill();
    const result = await internalToPublicDefinition(skill);

    expect(result.plugin_id).toBeUndefined();
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

describe('resolveSkill', () => {
  const skill = (overrides: Partial<InternalSkillDefinition>): InternalSkillDefinition => ({
    id: 'id',
    name: 'name',
    description: '',
    content: '',
    readonly: true,
    basePath: 'skills/platform',
    getRegistryTools: () => [],
    experimental: false,
    referencedContentCount: 0,
    ...overrides,
  });

  describe('by bare name', () => {
    it('resolves a uniquely-named skill', () => {
      const s = skill({ id: 'a', name: 'foo' });
      const result = resolveSkill('foo', [s]);
      expect(result).toEqual({ match: s });
    });

    it('returns a not-found error when no skill matches', () => {
      const result = resolveSkill('nope', []);
      expect(result).toEqual({ error: "Skill 'nope' not found." });
    });

    it('returns an ambiguity error listing the SKILL.md paths of all matches', () => {
      const a = skill({ id: 'a', name: 'shared', basePath: 'skills/platform' });
      const b = skill({ id: 'b', name: 'shared', basePath: 'skills/security' });
      const result = resolveSkill('shared', [a, b]);
      expect('error' in result).toBe(true);
      const message = (result as { error: string }).error;
      expect(message).toContain("Skill name 'shared' is ambiguous");
      expect(message).toContain('skills/platform/shared/SKILL.md');
      expect(message).toContain('skills/security/shared/SKILL.md');
      expect(message).toContain('Re-call load_skill using the full path to disambiguate');
    });
  });

  describe('by folder path', () => {
    it('resolves an exact folder match', () => {
      const a = skill({ id: 'a', name: 'shared', basePath: 'skills/platform' });
      const b = skill({ id: 'b', name: 'shared', basePath: 'skills/security' });
      expect(resolveSkill('skills/security/shared', [a, b])).toEqual({ match: b });
    });

    it('returns a path-specific not-found error when no skill matches the path', () => {
      expect(resolveSkill('skills/security/nope', [])).toEqual({
        error: "Skill not found at path 'skills/security/nope'.",
      });
    });
  });

  describe('by SKILL.md path', () => {
    it('resolves by stripping the /SKILL.md suffix', () => {
      const s = skill({ id: 'a', name: 'my-skill', basePath: 'skills/platform' });
      expect(resolveSkill('skills/platform/my-skill/SKILL.md', [s])).toEqual({ match: s });
    });

    it('preserves the original input in the path-not-found error message', () => {
      const result = resolveSkill('skills/platform/nope/SKILL.md', []);
      expect(result).toEqual({
        error: "Skill not found at path 'skills/platform/nope/SKILL.md'.",
      });
    });
  });

  describe('input normalization', () => {
    it('tolerates a leading slash on path inputs', () => {
      const s = skill({ id: 'a', name: 'my-skill', basePath: 'skills/platform' });
      expect(resolveSkill('/skills/platform/my-skill', [s])).toEqual({ match: s });
    });

    it('trims surrounding whitespace', () => {
      const s = skill({ id: 'a', name: 'my-skill' });
      expect(resolveSkill('  my-skill  ', [s])).toEqual({ match: s });
    });
  });
});
