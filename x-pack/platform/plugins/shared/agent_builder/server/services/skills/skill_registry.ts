/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import {
  createBadRequestError,
  createSkillNotFoundError,
  validateSkillId,
  type PersistedSkillCreateRequest,
  type PersistedSkillUpdateRequest,
} from '@kbn/agent-builder-common';
import type { SkillProvider, ReadonlySkillProvider, WritableSkillProvider } from './skill_provider';
import { isReadonlySkillProvider } from './skill_provider';

export interface SkillRegistry {
  has(skillId: string): Promise<boolean>;
  get(skillId: string): Promise<InternalSkillDefinition>;
  list(): Promise<InternalSkillDefinition[]>;
  create(params: PersistedSkillCreateRequest): Promise<InternalSkillDefinition>;
  update(skillId: string, update: PersistedSkillUpdateRequest): Promise<InternalSkillDefinition>;
  /** Deletes a skill. Throws if the skill does not exist or is read-only. */
  delete(skillId: string): Promise<void>;
}

export interface CreateSkillRegistryParams {
  builtinProvider: ReadonlySkillProvider;
  persistedProvider: WritableSkillProvider;
  toolRegistry: ToolRegistry;
}

export const createSkillRegistry = (params: CreateSkillRegistryParams): SkillRegistry => {
  return new SkillRegistryImpl(params);
};

class SkillRegistryImpl implements SkillRegistry {
  private static readonly MAX_TOOL_IDS_PER_SKILL = 5;

  private readonly builtinProvider: ReadonlySkillProvider;
  private readonly persistedProvider: WritableSkillProvider;
  private readonly toolRegistry: ToolRegistry;

  constructor({ builtinProvider, persistedProvider, toolRegistry }: CreateSkillRegistryParams) {
    this.builtinProvider = builtinProvider;
    this.persistedProvider = persistedProvider;
    this.toolRegistry = toolRegistry;
  }

  private get orderedProviders(): SkillProvider[] {
    return [this.builtinProvider, this.persistedProvider];
  }

  async has(skillId: string): Promise<boolean> {
    for (const provider of this.orderedProviders) {
      if (await provider.has(skillId)) {
        return true;
      }
    }
    return false;
  }

  async get(skillId: string): Promise<InternalSkillDefinition> {
    for (const provider of this.orderedProviders) {
      const skill = await provider.get(skillId);
      if (skill) {
        return skill;
      }
    }
    throw createSkillNotFoundError({ skillId });
  }

  async list(): Promise<InternalSkillDefinition[]> {
    const allSkills: InternalSkillDefinition[] = [];
    for (const provider of this.orderedProviders) {
      const skills = await provider.list();
      allSkills.push(...skills);
    }
    return allSkills;
  }

  async create(createRequest: PersistedSkillCreateRequest): Promise<InternalSkillDefinition> {
    const { id: skillId } = createRequest;

    const validationError = validateSkillId(skillId);
    if (validationError) {
      throw createBadRequestError(`Invalid skill id: "${skillId}": ${validationError}`);
    }

    if (await this.has(skillId)) {
      throw createBadRequestError(`Skill with id '${skillId}' already exists`);
    }

    await this.validateToolIds(createRequest.tool_ids);

    return this.persistedProvider.create(createRequest);
  }

  async update(
    skillId: string,
    update: PersistedSkillUpdateRequest
  ): Promise<InternalSkillDefinition> {
    for (const provider of this.orderedProviders) {
      if (await provider.has(skillId)) {
        if (isReadonlySkillProvider(provider)) {
          throw createBadRequestError(`Skill '${skillId}' is read-only and can't be updated`);
        }

        if (update.tool_ids) {
          await this.validateToolIds(update.tool_ids);
        }

        return provider.update(skillId, update);
      }
    }
    throw createSkillNotFoundError({ skillId });
  }

  async delete(skillId: string): Promise<void> {
    for (const provider of this.orderedProviders) {
      if (await provider.has(skillId)) {
        if (isReadonlySkillProvider(provider)) {
          throw createBadRequestError(`Skill '${skillId}' is read-only and can't be deleted`);
        }
        await provider.delete(skillId);
        return;
      }
    }
    throw createSkillNotFoundError({ skillId });
  }

  /**
   * Validates that all tool IDs exist in the tool registry
   * and enforces a maximum of 5 tools per skill.
   */
  private async validateToolIds(toolIds: string[]): Promise<void> {
    if (!toolIds || toolIds.length === 0) {
      return;
    }

    if (toolIds.length > SkillRegistryImpl.MAX_TOOL_IDS_PER_SKILL) {
      throw createBadRequestError(
        `A skill can reference at most ${SkillRegistryImpl.MAX_TOOL_IDS_PER_SKILL} tools, but ${toolIds.length} were provided.`
      );
    }

    const invalidIds: string[] = [];
    for (const toolId of toolIds) {
      if (!(await this.toolRegistry.has(toolId))) {
        invalidIds.push(toolId);
      }
    }

    if (invalidIds.length > 0) {
      throw createBadRequestError(
        `Invalid tool IDs: ${invalidIds.join(', ')}. These tools do not exist in the tool registry.`
      );
    }
  }
}
