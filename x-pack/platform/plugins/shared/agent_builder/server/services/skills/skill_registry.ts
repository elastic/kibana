/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import {
  createBadRequestError,
  validateSkillId,
  type PublicSkillDefinition,
  type PersistedSkillCreateRequest,
  type PersistedSkillUpdateRequest,
  type SkillSelection,
  allSkillsSelectionWildcard,
} from '@kbn/agent-builder-common';
import type { SkillProvider, SkillRegistry } from './skill_service';

interface CreateSkillRegistryParams {
  builtinSkills: SkillDefinition[];
  persistedProvider: SkillProvider;
  toolRegistry: ToolRegistry;
}

export const createSkillRegistry = (params: CreateSkillRegistryParams): SkillRegistry => {
  return new SkillRegistryImpl(params);
};

class SkillRegistryImpl implements SkillRegistry {
  private static readonly MAX_TOOL_IDS_PER_SKILL = 5;

  private readonly builtinSkillsMap: Map<string, SkillDefinition>;
  private readonly persistedProvider: SkillProvider;
  private readonly toolRegistry: ToolRegistry;

  constructor({ builtinSkills, persistedProvider, toolRegistry }: CreateSkillRegistryParams) {
    this.builtinSkillsMap = new Map(builtinSkills.map((skill) => [skill.id, skill]));
    this.persistedProvider = persistedProvider;
    this.toolRegistry = toolRegistry;
  }

  async has(skillId: string): Promise<boolean> {
    if (this.builtinSkillsMap.has(skillId)) {
      return true;
    }
    return this.persistedProvider.has(skillId);
  }

  async get(skillId: string): Promise<SkillDefinition | PublicSkillDefinition | undefined> {
    const builtinSkill = this.builtinSkillsMap.get(skillId);
    if (builtinSkill) {
      return builtinSkill;
    }
    return this.persistedProvider.get(skillId);
  }

  async list(): Promise<PublicSkillDefinition[]> {
    const builtinPublic: PublicSkillDefinition[] = [...this.builtinSkillsMap.values()].map(
      (skill) => ({
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
      })
    );

    const persistedSkills = await this.persistedProvider.list();

    return [...builtinPublic, ...persistedSkills];
  }

  async listSkillDefinitions(): Promise<SkillDefinition[]> {
    return [...this.builtinSkillsMap.values()];
  }

  async create(createRequest: PersistedSkillCreateRequest): Promise<PublicSkillDefinition> {
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
  ): Promise<PublicSkillDefinition> {
    if (this.builtinSkillsMap.has(skillId)) {
      throw createBadRequestError(`Skill '${skillId}' is read-only and can't be updated`);
    }

    if (!(await this.persistedProvider.has(skillId))) {
      throw createBadRequestError(`Skill with id '${skillId}' not found`);
    }

    if (update.tool_ids) {
      await this.validateToolIds(update.tool_ids);
    }

    return this.persistedProvider.update(skillId, update);
  }

  async delete(skillId: string): Promise<boolean> {
    if (this.builtinSkillsMap.has(skillId)) {
      throw createBadRequestError(`Skill '${skillId}' is read-only and can't be deleted`);
    }

    if (!(await this.persistedProvider.has(skillId))) {
      throw createBadRequestError(`Skill with id '${skillId}' not found`);
    }

    return this.persistedProvider.delete(skillId);
  }

  async resolveSkillSelection(selection: SkillSelection[]): Promise<SkillDefinition[]> {
    if (!selection || selection.length === 0) {
      return [];
    }

    const result: SkillDefinition[] = [];
    const seenIds = new Set<string>();

    for (const sel of selection) {
      for (const skillId of sel.skill_ids) {
        if (skillId === allSkillsSelectionWildcard) {
          for (const skill of this.builtinSkillsMap.values()) {
            if (!seenIds.has(skill.id)) {
              seenIds.add(skill.id);
              result.push(skill);
            }
          }
        } else if (!seenIds.has(skillId)) {
          const builtinSkill = this.builtinSkillsMap.get(skillId);
          if (builtinSkill) {
            seenIds.add(skillId);
            result.push(builtinSkill);
          } else {
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

  private convertPersistedToSkillDefinition(skill: PublicSkillDefinition): SkillDefinition {
    const toolIds = skill.tool_ids ?? [];
    return {
      id: skill.id,
      name: skill.name as any,
      basePath: 'skills/platform' as any,
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
