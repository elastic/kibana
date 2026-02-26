/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSkillNotFoundError } from '@kbn/agent-builder-common';
import { createPersistedSkillProvider } from './provider';
import type { SkillClient, SkillPersistedDefinition } from './client';

jest.mock('./client', () => ({
  createClient: jest.fn(),
}));

const createMockPersistedSkill = (
  overrides: Partial<SkillPersistedDefinition> = {}
): SkillPersistedDefinition => ({
  id: 'persisted-skill-1',
  name: 'my-persisted-skill',
  description: 'A persisted skill',
  content: 'Instructions content',
  tool_ids: ['tool-a'],
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-02T00:00:00.000Z',
  ...overrides,
});

const createMockClient = (): jest.Mocked<SkillClient> => ({
  has: jest.fn(),
  get: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('createPersistedSkillProvider', () => {
  let mockClient: jest.Mocked<SkillClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
    const { createClient } = jest.requireMock('./client');
    createClient.mockReturnValue(mockClient);
  });

  const createProvider = () =>
    createPersistedSkillProvider({
      space: 'default',
      esClient: {} as any,
      logger: { warn: jest.fn() } as any,
    });

  it('has id "persisted" and readonly false', () => {
    const provider = createProvider();

    expect(provider.id).toBe('persisted');
    expect(provider.readonly).toBe(false);
  });

  describe('has', () => {
    it('delegates to skillClient.has', async () => {
      mockClient.has.mockResolvedValue(true);
      const provider = createProvider();

      const result = await provider.has('skill-1');

      expect(result).toBe(true);
      expect(mockClient.has).toHaveBeenCalledWith('skill-1');
    });
  });

  describe('get', () => {
    it('returns converted InternalSkillDefinition', async () => {
      const skill = createMockPersistedSkill({ id: 'skill-1' });
      mockClient.get.mockResolvedValue(skill);
      const provider = createProvider();

      const result = await provider.get('skill-1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('skill-1');
      expect(result!.readonly).toBe(false);
      expect(result!.getRegistryTools()).toEqual(['tool-a']);
    });

    it('returns undefined when client throws skillNotFound', async () => {
      mockClient.get.mockRejectedValue(createSkillNotFoundError({ skillId: 'non-existent' }));
      const provider = createProvider();

      const result = await provider.get('non-existent');

      expect(result).toBeUndefined();
    });

    it('propagates non-skillNotFound errors', async () => {
      mockClient.get.mockRejectedValue(new Error('ES connection failed'));
      const provider = createProvider();

      await expect(provider.get('skill-1')).rejects.toThrow('ES connection failed');
    });
  });

  describe('list', () => {
    it('returns converted skills from client', async () => {
      const skills = [
        createMockPersistedSkill({ id: 'skill-1' }),
        createMockPersistedSkill({ id: 'skill-2' }),
      ];
      mockClient.list.mockResolvedValue(skills);
      const provider = createProvider();

      const result = await provider.list();

      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toEqual(['skill-1', 'skill-2']);
      result.forEach((s) => expect(s.readonly).toBe(false));
    });

    it('returns empty array when no skills exist', async () => {
      mockClient.list.mockResolvedValue([]);
      const provider = createProvider();

      const result = await provider.list();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates and returns converted skill', async () => {
      const created = createMockPersistedSkill({ id: 'new-skill' });
      mockClient.create.mockResolvedValue(created);
      const provider = createProvider();

      const result = await provider.create({
        id: 'new-skill',
        name: 'New Skill',
        description: 'A new skill',
        content: 'Content',
        tool_ids: [],
      });

      expect(result.id).toBe('new-skill');
      expect(result.readonly).toBe(false);
      expect(mockClient.create).toHaveBeenCalledWith({
        id: 'new-skill',
        name: 'New Skill',
        description: 'A new skill',
        content: 'Content',
        tool_ids: [],
      });
    });
  });

  describe('update', () => {
    it('updates and returns converted skill', async () => {
      const updated = createMockPersistedSkill({ id: 'skill-1', name: 'Updated Name' });
      mockClient.update.mockResolvedValue(updated);
      const provider = createProvider();

      const result = await provider.update('skill-1', { name: 'Updated Name' });

      expect(result.id).toBe('skill-1');
      expect(result.name).toBe('Updated Name');
      expect(mockClient.update).toHaveBeenCalledWith('skill-1', { name: 'Updated Name' });
    });
  });

  describe('delete', () => {
    it('delegates to skillClient.delete', async () => {
      mockClient.delete.mockResolvedValue(undefined);
      const provider = createProvider();

      await provider.delete('skill-1');

      expect(mockClient.delete).toHaveBeenCalledWith('skill-1');
    });
  });
});
