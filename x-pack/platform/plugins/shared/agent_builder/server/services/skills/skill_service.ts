/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
import type { ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { MaybePromise } from '@kbn/utility-types';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import {
  createBadRequestError,
  validateSkillId,
  type PublicSkillDefinition,
  type PersistedSkillCreateRequest,
  type PersistedSkillUpdateRequest,
} from '@kbn/agent-builder-common';
import { createClient } from './client';
import type { SkillPersistedDefinition } from './client';
import { getCurrentSpaceId } from '../../utils/spaces';
import { getSkillEntryPath } from '../runner/store/volumes/skills/utils';

const toPublicDefinition = (skill: SkillPersistedDefinition): PublicSkillDefinition => {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    content: skill.content,
    referenced_content: skill.referenced_content,
    tool_ids: skill.tool_ids,
    readonly: false,
  };
};

export interface SkillProvider {
  id: string;
  has(skillId: string): MaybePromise<boolean>;
  get(skillId: string): MaybePromise<PublicSkillDefinition | undefined>;
  list(): MaybePromise<PublicSkillDefinition[]>;
  create(params: PersistedSkillCreateRequest): MaybePromise<PublicSkillDefinition>;
  update(skillId: string, update: PersistedSkillUpdateRequest): MaybePromise<PublicSkillDefinition>;
  delete(skillId: string): MaybePromise<boolean>;
}

export interface SkillRegistry {
  has(skillId: string): Promise<boolean>;
  get(skillId: string): Promise<SkillDefinition | PublicSkillDefinition | undefined>;
  list(): Promise<PublicSkillDefinition[]>;
  listSkillDefinitions(): Promise<SkillDefinition[]>;
  create(params: PersistedSkillCreateRequest): Promise<PublicSkillDefinition>;
  update(skillId: string, update: PersistedSkillUpdateRequest): Promise<PublicSkillDefinition>;
  delete(skillId: string): Promise<boolean>;
}

interface CreateSkillRegistryParams {
  builtinSkills: SkillDefinition[];
  persistedProvider: SkillProvider;
  toolRegistry: ToolRegistry;
}

export const createSkillRegistry = (params: CreateSkillRegistryParams): SkillRegistry => {
  return new SkillRegistryImpl(params);
};

export interface SkillServiceSetup {
  registerSkill(skill: SkillDefinition): Promise<void>;
}

export interface SkillServiceStart {
  /**
   * Create a skill registry scoped to the current user and context.
   */
  getRegistry(opts: { request: KibanaRequest }): Promise<SkillRegistry>;
}

export interface SkillService {
  setup: () => SkillServiceSetup;
  start: (deps: SkillServiceStartDeps) => SkillServiceStart;
}

export interface SkillServiceStartDeps {
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
  logger: Logger;
  getToolRegistry: (opts: { request: KibanaRequest }) => Promise<ToolRegistry>;
}

export const createSkillService = (): SkillService => {
  return new SkillServiceImpl();
};

class SkillServiceImpl implements SkillService {
  private readonly skills: Map<string, SkillDefinition> = new Map();
  private readonly skillFullPaths: Set<string> = new Set();

  setup(): SkillServiceSetup {
    return {
      registerSkill: async (skill) => {
        await validateSkillDefinition(skill);

        if (this.skills.has(skill.id)) {
          throw new Error(`Skill type with id ${skill.id} already registered`);
        }

        const fullPath = getSkillEntryPath({ skill });
        if (this.skillFullPaths.has(fullPath)) {
          throw new Error(
            `Skill with path ${skill.basePath} and name ${skill.name} already registered`
          );
        }
        this.skillFullPaths.add(fullPath);
        this.skills.set(skill.id, skill);
      },
    };
  }

  start({
    elasticsearch,
    spaces,
    logger,
    getToolRegistry,
  }: SkillServiceStartDeps): SkillServiceStart {
    return {
      getRegistry: async ({ request }) => {
        const space = getCurrentSpaceId({ request, spaces });
        const esClient = elasticsearch.client.asInternalUser;
        const skillClient = createClient({ space, esClient, logger });

        const persistedProvider: SkillProvider = {
          id: 'persisted',
          async has(skillId: string) {
            return skillClient.has(skillId);
          },
          async get(skillId: string) {
            try {
              const skill = await skillClient.get(skillId);
              return toPublicDefinition(skill);
            } catch {
              return undefined;
            }
          },
          async list() {
            const skills = await skillClient.list();
            return skills.map(toPublicDefinition);
          },
          async create(createRequest) {
            const skill = await skillClient.create(createRequest);
            return toPublicDefinition(skill);
          },
          async update(skillId, updateRequest) {
            const skill = await skillClient.update(skillId, updateRequest);
            return toPublicDefinition(skill);
          },
          async delete(skillId: string) {
            return skillClient.delete(skillId);
          },
        };

        const toolRegistry = await getToolRegistry({ request });

        return createSkillRegistry({
          builtinSkills: [...this.skills.values()],
          persistedProvider,
          toolRegistry,
        });
      },
    };
  }
}

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
    // Built-in first, then persisted
    const builtinSkill = this.builtinSkillsMap.get(skillId);
    if (builtinSkill) {
      return builtinSkill;
    }
    return this.persistedProvider.get(skillId);
  }

  /**
   * Lists all skills (built-in + persisted) as PublicSkillDefinition for API responses.
   */
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

  /**
   * Lists all built-in SkillDefinitions (for runtime use in the skill store).
   */
  async listSkillDefinitions(): Promise<SkillDefinition[]> {
    return [...this.builtinSkillsMap.values()];
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
    if (this.builtinSkillsMap.has(skillId)) {
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
    if (this.builtinSkillsMap.has(skillId)) {
      throw createBadRequestError(`Skill '${skillId}' is read-only and can't be deleted`);
    }

    // Check if skill exists in persisted provider
    if (!(await this.persistedProvider.has(skillId))) {
      throw createBadRequestError(`Skill with id '${skillId}' not found`);
    }

    return this.persistedProvider.delete(skillId);
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
