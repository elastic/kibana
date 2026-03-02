/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type {
  PersistedSkillCreateRequest,
  PersistedSkillUpdateRequest,
} from '@kbn/agent-builder-common';
import type { ReadonlySkillProvider, WritableSkillProvider } from './skill_provider';

const MAX_TOOLS_PER_SKILL = 5;

export interface SkillRegistry {
  has(skillId: string): Promise<boolean>;
  get(skillId: string): Promise<InternalSkillDefinition | undefined>;
  list(): Promise<InternalSkillDefinition[]>;
  create(params: PersistedSkillCreateRequest): Promise<InternalSkillDefinition>;
  update(skillId: string, update: PersistedSkillUpdateRequest): Promise<InternalSkillDefinition>;
  delete(skillId: string): Promise<boolean>;
}

export const createSkillRegistry = ({
  builtinProvider,
  persistedProvider,
  toolRegistry,
}: {
  builtinProvider: ReadonlySkillProvider;
  persistedProvider: WritableSkillProvider;
  toolRegistry: ToolRegistry;
}): SkillRegistry => {
  const validateToolIds = async (toolIds: string[] | undefined) => {
    if (!toolIds || toolIds.length === 0) {
      return;
    }
    if (toolIds.length > MAX_TOOLS_PER_SKILL) {
      throw new Error(
        `A skill can reference at most ${MAX_TOOLS_PER_SKILL} tools, but ${toolIds.length} were provided.`
      );
    }
    const invalidIds: string[] = [];
    for (const toolId of toolIds) {
      const exists = await toolRegistry.has(toolId);
      if (!exists) {
        invalidIds.push(toolId);
      }
    }
    if (invalidIds.length > 0) {
      throw new Error(`Invalid tool IDs: ${invalidIds.join(', ')}`);
    }
  };

  return {
    async has(skillId) {
      return (await builtinProvider.has(skillId)) || (await persistedProvider.has(skillId));
    },

    async get(skillId) {
      const builtin = await builtinProvider.get(skillId);
      if (builtin) {
        return builtin;
      }
      return persistedProvider.get(skillId);
    },

    async list() {
      const [builtinSkills, persistedSkills] = await Promise.all([
        builtinProvider.list(),
        persistedProvider.list(),
      ]);
      return [...builtinSkills, ...persistedSkills];
    },

    async create(params) {
      const existsInBuiltin = await builtinProvider.has(params.id);
      if (existsInBuiltin) {
        throw new Error(`Skill with id '${params.id}' already exists as a built-in skill.`);
      }
      const existsInPersisted = await persistedProvider.has(params.id);
      if (existsInPersisted) {
        throw new Error(`Skill with id '${params.id}' already exists.`);
      }
      await validateToolIds(params.tool_ids);
      return persistedProvider.create(params);
    },

    async update(skillId, updateRequest) {
      const existsInBuiltin = await builtinProvider.has(skillId);
      if (existsInBuiltin) {
        throw new Error(`Skill '${skillId}' is read-only`);
      }
      await validateToolIds(updateRequest.tool_ids);
      return persistedProvider.update(skillId, updateRequest);
    },

    async delete(skillId) {
      const existsInBuiltin = await builtinProvider.has(skillId);
      if (existsInBuiltin) {
        throw new Error(`Skill '${skillId}' is read-only`);
      }
      await persistedProvider.delete(skillId);
      return true;
    },
  };
};
