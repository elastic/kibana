/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import {
  type PersistedSkillCreateRequest,
  type PersistedSkillUpdateRequest,
  createBadRequestError,
  createAgentBuilderError,
  AgentBuilderErrorCode,
  maxToolsPerSkill,
} from '@kbn/agent-builder-common';
import type { SkillRegistryListOptions } from '@kbn/agent-builder-server/runner';
import type { ReadonlySkillProvider, WritableSkillProvider } from './skill_provider';

export interface SkillRegistry {
  has(skillId: string): Promise<boolean>;
  get(skillId: string): Promise<InternalSkillDefinition | undefined>;
  bulkGet(ids: string[]): Promise<Map<string, InternalSkillDefinition>>;
  list(options?: SkillRegistryListOptions): Promise<InternalSkillDefinition[]>;
  create(params: PersistedSkillCreateRequest): Promise<InternalSkillDefinition>;
  update(skillId: string, update: PersistedSkillUpdateRequest): Promise<InternalSkillDefinition>;
  delete(skillId: string): Promise<boolean>;
}

export const createSkillRegistry = ({
  builtinProvider,
  persistedProvider,
  toolRegistry,
  experimentalFeaturesEnabled,
}: {
  builtinProvider: ReadonlySkillProvider;
  persistedProvider: WritableSkillProvider;
  toolRegistry: ToolRegistry;
  experimentalFeaturesEnabled: boolean;
}): SkillRegistry => {
  const isVisible = (skill: InternalSkillDefinition): boolean =>
    !skill.experimental || experimentalFeaturesEnabled;
  const validateToolIds = async (toolIds: string[] | undefined) => {
    if (!toolIds || toolIds.length === 0) {
      return;
    }
    if (toolIds.length > maxToolsPerSkill) {
      throw createBadRequestError(
        `A skill can reference at most ${maxToolsPerSkill} tools, but ${toolIds.length} were provided.`
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
      throw createBadRequestError(`Invalid tool IDs: ${invalidIds.join(', ')}`);
    }
  };

  return {
    async has(skillId) {
      const builtinSkill = await builtinProvider.get(skillId);
      if (builtinSkill) {
        return isVisible(builtinSkill);
      }
      const persistedSkill = await persistedProvider.get(skillId);
      if (persistedSkill) {
        return isVisible(persistedSkill);
      }
      return false;
    },

    async get(skillId) {
      const builtin = await builtinProvider.get(skillId);
      if (builtin) {
        return isVisible(builtin) ? builtin : undefined;
      }
      const persisted = await persistedProvider.get(skillId);
      if (persisted) {
        return isVisible(persisted) ? persisted : undefined;
      }
      return undefined;
    },

    async bulkGet(ids) {
      const builtinResult = await builtinProvider.bulkGet(ids);
      // Filter out experimental skills from builtin results
      for (const [id, skill] of builtinResult) {
        if (!isVisible(skill)) {
          builtinResult.delete(id);
        }
      }
      const remainingIds = ids.filter((id) => !builtinResult.has(id));
      if (remainingIds.length === 0) {
        return builtinResult;
      }
      const persistedResult = await persistedProvider.bulkGet(remainingIds);
      for (const [id, skill] of persistedResult) {
        if (isVisible(skill)) {
          builtinResult.set(id, skill);
        }
      }
      return builtinResult;
    },

    async list(options) {
      const { type, ...listOptions } = options ?? {};
      if (type === 'built-in') {
        const skills = await builtinProvider.list(listOptions);
        return skills.filter(isVisible);
      }
      if (type === 'persisted') {
        const skills = await persistedProvider.list(listOptions);
        return skills.filter(isVisible);
      }
      const [builtinSkills, persistedSkills] = await Promise.all([
        builtinProvider.list(listOptions),
        persistedProvider.list(listOptions),
      ]);
      return [...builtinSkills, ...persistedSkills].filter(isVisible);
    },

    async create(params) {
      const existsInBuiltin = await builtinProvider.has(params.id);
      if (existsInBuiltin) {
        throw createAgentBuilderError(
          AgentBuilderErrorCode.badRequest,
          `Skill with id '${params.id}' already exists as a built-in skill.`,
          { statusCode: 409 }
        );
      }
      const existsInPersisted = await persistedProvider.has(params.id);
      if (existsInPersisted) {
        throw createAgentBuilderError(
          AgentBuilderErrorCode.badRequest,
          `Skill with id '${params.id}' already exists.`,
          { statusCode: 409 }
        );
      }
      await validateToolIds(params.tool_ids);
      return persistedProvider.create(params);
    },

    async update(skillId, updateRequest) {
      const existsInBuiltin = await builtinProvider.has(skillId);
      if (existsInBuiltin) {
        throw createBadRequestError(`Skill '${skillId}' is read-only`);
      }
      await validateToolIds(updateRequest.tool_ids);
      return persistedProvider.update(skillId, updateRequest);
    },

    async delete(skillId) {
      const existsInBuiltin = await builtinProvider.has(skillId);
      if (existsInBuiltin) {
        throw createBadRequestError(`Skill '${skillId}' is read-only`);
      }
      await persistedProvider.delete(skillId);
      return true;
    },
  };
};
