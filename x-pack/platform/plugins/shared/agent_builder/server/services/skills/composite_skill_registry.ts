/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import {
  createBadRequestError,
  validateSkillId,
  type PublicSkillDefinition,
  type PersistedSkillCreateRequest,
  type PersistedSkillUpdateRequest,
  type SkillSelection,
  allSkillsSelectionWildcard,
} from '@kbn/agent-builder-common';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { ReadonlySkillProvider, WritableSkillProvider } from './skill_provider';

interface CreateCompositeSkillRegistryParams {
  builtinProvider: ReadonlySkillProvider;
  persistedProvider: WritableSkillProvider;
  toolRegistry: ToolRegistry;
}

/**
 * Composite skill registry interface that exposes unified access
 * to both built-in and persisted skills.
 */
export interface CompositeSkillRegistry {
  has(skillId: string): Promise<boolean>;
  get(skillId: string): Promise<SkillDefinition | PublicSkillDefinition | undefined>;
  list(): Promise<PublicSkillDefinition[]>;
  listSkillDefinitions(): Promise<SkillDefinition[]>;
  create(params: PersistedSkillCreateRequest): Promise<PublicSkillDefinition>;
  update(skillId: string, update: PersistedSkillUpdateRequest): Promise<PublicSkillDefinition>;
  delete(skillId: string): Promise<boolean>;
  resolveSkillSelection(selection: SkillSelection[]): Promise<SkillDefinition[]>;
}

export const createCompositeSkillRegistry = (
  params: CreateCompositeSkillRegistryParams
): CompositeSkillRegistry => {
  return new CompositeSkillRegistryImpl(params);
};

class CompositeSkillRegistryImpl implements CompositeSkillRegistry {
  private readonly builtinProvider: ReadonlySkillProvider;
  private readonly persistedProvider: WritableSkillProvider;
  private readonly toolRegistry: ToolRegistry;

  constructor({
    builtinProvider,
    persistedProvider,
    toolRegistry,
  }: CreateCompositeSkillRegistryParams) {
    this.builtinProvider = builtinProvider;
    this.persistedProvider = persistedProvider;
    this.toolRegistry = toolRegistry;
  }

  async has(skillId: string): Promise<boolean> {
    if (await this.builtinProvider.has(skillId)) {
      return true;
    }
    return this.persistedProvider.has(skillId);
  }

  async get(skillId: string): Promise<SkillDefinition | PublicSkillDefinition | undefined> {
    // Built-in first, then persisted
    const builtinSkill = await this.builtinProvider.get(skillId);
    if (builtinSkill) {
      return builtinSkill;
    }
    return this.persistedProvider.get(skillId);
  }

  /**
   * Lists all skills (built-in + persisted) as PublicSkillDefinition for API responses.
   */
  async list(): Promise<PublicSkillDefinition[]> {
    const builtinSkills = await this.builtinProvider.list();
    const builtinPublic: PublicSkillDefinition[] = builtinSkills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      content: skill.content,
      referenced_content: skill.referencedContent?.map((rc) => ({
        name: rc.name,
        relativePath: rc.relativePath,
        content: rc.content,
      })),
      readonly: true,
    }));

    const persistedSkills = await this.persistedProvider.list();

    return [...builtinPublic, ...persistedSkills];
  }

  /**
   * Lists all built-in SkillDefinitions (for runtime use in the skill store).
   */
  async listSkillDefinitions(): Promise<SkillDefinition[]> {
    return this.builtinProvider.list();
  }

  async create(createRequest: PersistedSkillCreateRequest): Promise<PublicSkillDefinition> {
    const { id: skillId } = createRequest;

    const validationError = validateSkillId(skillId);
    if (validationError) {
      throw createBadRequestError(`Invalid skill id: "${skillId}": ${validationError}`);
    }

    // Check for duplicates across both providers
    if (await this.has(skillId)) {
      throw createBadRequestError(`Skill with id '${skillId}' already exists`);
    }

    // Validate tool IDs exist in the tool registry
    await this.validateToolIds(createRequest.tool_ids);

    return this.persistedProvider.create(createRequest);
  }

  async update(
    skillId: string,
    update: PersistedSkillUpdateRequest
  ): Promise<PublicSkillDefinition> {
    // Check if this is a built-in skill (read-only)
    if (await this.builtinProvider.has(skillId)) {
      throw createBadRequestError(`Skill '${skillId}' is read-only and can't be updated`);
    }

    // Check if skill exists in persisted provider
    if (!(await this.persistedProvider.has(skillId))) {
      throw createBadRequestError(`Skill with id '${skillId}' not found`);
    }

    // Validate tool IDs if provided
    if (update.tool_ids) {
      await this.validateToolIds(update.tool_ids);
    }

    return this.persistedProvider.update(skillId, update);
  }

  async delete(skillId: string): Promise<boolean> {
    // Check if this is a built-in skill (read-only)
    if (await this.builtinProvider.has(skillId)) {
      throw createBadRequestError(`Skill '${skillId}' is read-only and can't be deleted`);
    }

    // Check if skill exists in persisted provider
    if (!(await this.persistedProvider.has(skillId))) {
      throw createBadRequestError(`Skill with id '${skillId}' not found`);
    }

    return this.persistedProvider.delete(skillId);
  }

  /**
   * Resolves a SkillSelection[] to concrete SkillDefinition[] for runtime use.
   * Expands wildcard '*' to all built-in skills, resolves explicit IDs from both providers.
   */
  async resolveSkillSelection(selection: SkillSelection[]): Promise<SkillDefinition[]> {
    if (!selection || selection.length === 0) {
      return [];
    }

    const builtinSkills = await this.builtinProvider.list();
    const result: SkillDefinition[] = [];
    const seenIds = new Set<string>();

    for (const sel of selection) {
      for (const skillId of sel.skill_ids) {
        if (skillId === allSkillsSelectionWildcard) {
          // Wildcard: add all built-in skills
          for (const skill of builtinSkills) {
            if (!seenIds.has(skill.id)) {
              seenIds.add(skill.id);
              result.push(skill);
            }
          }
        } else if (!seenIds.has(skillId)) {
          // Try built-in first
          const builtinSkill = await this.builtinProvider.get(skillId);
          if (builtinSkill) {
            seenIds.add(skillId);
            result.push(builtinSkill);
          } else {
            // Try persisted - convert to SkillDefinition for runtime
            const persistedSkill = await this.persistedProvider.get(skillId);
            if (persistedSkill) {
              seenIds.add(skillId);
              result.push(this.convertPersistedToSkillDefinition(persistedSkill));
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Validates that all tool IDs exist in the tool registry.
   */
  private async validateToolIds(toolIds: string[]): Promise<void> {
    if (!toolIds || toolIds.length === 0) {
      return;
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

  /**
   * Converts a PublicSkillDefinition (persisted) to a runtime SkillDefinition.
   * Maps `tool_ids` to `getAllowedTools()`.
   */
  private convertPersistedToSkillDefinition(skill: PublicSkillDefinition): SkillDefinition {
    const toolIds = skill.tool_ids ?? [];
    return {
      id: skill.id,
      name: skill.name as any, // Persisted skills use simpler name constraints
      basePath: 'skills/platform' as any, // User-created skills use a generic base path
      description: skill.description,
      content: skill.content,
      referencedContent: skill.referenced_content?.map((rc) => ({
        name: rc.name,
        relativePath: rc.relativePath,
        content: rc.content,
      })),
      getAllowedTools: () => toolIds as any[],
    };
  }
}
