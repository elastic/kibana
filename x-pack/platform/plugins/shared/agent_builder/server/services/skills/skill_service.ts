/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SkillDefinition, InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
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
import { getCurrentSpaceId } from '../../utils/spaces';
import { getSkillEntryPath } from '../runner/store/volumes/skills/utils';
import type { SkillProvider, WritableSkillProvider } from './skill_provider';
import { isWritableSkillProvider } from './skill_provider';
import { createBuiltinSkillProvider } from './builtin';
import { createPersistedSkillProvider } from './persisted';
import { internalToPublicDefinition } from './utils';

export type { SkillProvider };

export interface SkillRegistry {
  has(skillId: string): Promise<boolean>;
  get(skillId: string): Promise<InternalSkillDefinition | undefined>;
  list(): Promise<PublicSkillDefinition[]>;
  listSkillDefinitions(): Promise<InternalSkillDefinition[]>;
  create(params: PersistedSkillCreateRequest): Promise<PublicSkillDefinition>;
  update(skillId: string, update: PersistedSkillUpdateRequest): Promise<PublicSkillDefinition>;
  delete(skillId: string): Promise<boolean>;
  resolveSkillSelection(selection: SkillSelection[]): Promise<InternalSkillDefinition[]>;
}

interface CreateSkillRegistryParams {
  builtinProvider: SkillProvider;
  persistedProvider: WritableSkillProvider;
  toolRegistry: ToolRegistry;
}

export const createSkillRegistry = (params: CreateSkillRegistryParams): SkillRegistry => {
  return new SkillRegistryImpl(params);
};

export interface SkillServiceSetup {
  /**
   * @deprecated This API is still in development and not ready to be used yet.
   */
  registerSkill(skill: SkillDefinition): void;
}

export interface SkillServiceStart {
  /**
   * Create a skill registry scoped to the current user and context.
   *
   * Each call snapshots the currently registered builtin skills, so
   * dynamic registrations or unregistrations that happen after the
   * registry is created do not affect that registry instance.
   */
  getRegistry(opts: { request: KibanaRequest }): Promise<SkillRegistry>;

  /**
   * Register a skill dynamically after plugin start.
   *
   * The operation is serialized internally so concurrent calls are safe.
   * Only affects future `getRegistry()` calls -- existing registry
   * instances hold an immutable snapshot of the builtin skills that
   * existed at creation time.
   */
  registerSkill(skill: SkillDefinition): Promise<void>;

  /**
   * Unregister a previously registered skill by ID.
   *
   * Returns `true` if the skill was found and removed, `false` otherwise.
   * Serialized with `registerSkill` to avoid races.
   */
  unregisterSkill(skillId: string): Promise<boolean>;
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

  /**
   * Promise chain used to serialize dynamic registration / unregistration
   * so that the async validate-then-mutate sequence is atomic.
   */
  private mutationQueue: Promise<unknown> = Promise.resolve();

  setup(): SkillServiceSetup {
    return {
      registerSkill: (skill) => {
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
    const validated = Promise.all(
      [...this.skills.values()].map((skill) => validateSkillDefinition(skill))
    );

    return {
      getRegistry: async ({ request }) => {
        await this.mutationQueue;
        await validated;
        const space = getCurrentSpaceId({ request, spaces });
        const builtinProvider = createBuiltinSkillProvider([...this.skills.values()]);
        const persistedProvider = createPersistedSkillProvider({
          space,
          esClient: elasticsearch.client.asInternalUser,
          logger,
        });
        const toolRegistry = await getToolRegistry({ request });

        return createSkillRegistry({
          builtinProvider,
          persistedProvider,
          toolRegistry,
        });
      },
      registerSkill: (skill) => {
        const op = this.mutationQueue.then(async () => {
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
        });
        this.mutationQueue = op.catch(() => {});
        return op;
      },
      unregisterSkill: (skillId) => {
        const op = this.mutationQueue.then(async () => {
          const skill = this.skills.get(skillId);
          if (!skill) {
            return false;
          }

          const fullPath = getSkillEntryPath({ skill });
          this.skillFullPaths.delete(fullPath);
          this.skills.delete(skillId);
          return true;
        });
        this.mutationQueue = op.catch(() => {});
        return op;
      },
    };
  }
}

class SkillRegistryImpl implements SkillRegistry {
  private readonly builtinProvider: SkillProvider;
  private readonly persistedProvider: WritableSkillProvider;
  private readonly toolRegistry: ToolRegistry;

  constructor({ builtinProvider, persistedProvider, toolRegistry }: CreateSkillRegistryParams) {
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

  async get(skillId: string): Promise<InternalSkillDefinition | undefined> {
    const builtinSkill = await this.builtinProvider.get(skillId);
    if (builtinSkill) {
      return builtinSkill;
    }
    return this.persistedProvider.get(skillId);
  }

  async list(): Promise<PublicSkillDefinition[]> {
    const builtinSkills = await this.builtinProvider.list();
    const builtinPublic = await Promise.all(
      builtinSkills.map((skill) => internalToPublicDefinition(skill))
    );

    const persistedSkills = await this.persistedProvider.list();
    const persistedPublic = await Promise.all(
      persistedSkills.map((skill) => internalToPublicDefinition(skill))
    );

    return [...builtinPublic, ...persistedPublic];
  }

  async listSkillDefinitions(): Promise<InternalSkillDefinition[]> {
    const builtinSkills = await this.builtinProvider.list();
    const persistedSkills = await this.persistedProvider.list();
    const builtinIds = new Set(builtinSkills.map((s) => s.id));
    const filteredPersisted = persistedSkills.filter((skill) => !builtinIds.has(skill.id));
    return [...builtinSkills, ...filteredPersisted];
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

    const created = await this.persistedProvider.create(createRequest);
    return internalToPublicDefinition(created);
  }

  async update(
    skillId: string,
    update: PersistedSkillUpdateRequest
  ): Promise<PublicSkillDefinition> {
    if (await this.builtinProvider.has(skillId)) {
      throw createBadRequestError(`Skill '${skillId}' is read-only and can't be updated`);
    }

    if (!(await this.persistedProvider.has(skillId))) {
      throw createBadRequestError(`Skill with id '${skillId}' not found`);
    }

    if (update.tool_ids) {
      await this.validateToolIds(update.tool_ids);
    }

    const updated = await this.persistedProvider.update(skillId, update);
    return internalToPublicDefinition(updated);
  }

  async delete(skillId: string): Promise<boolean> {
    if (await this.builtinProvider.has(skillId)) {
      throw createBadRequestError(`Skill '${skillId}' is read-only and can't be deleted`);
    }

    if (!(await this.persistedProvider.has(skillId))) {
      throw createBadRequestError(`Skill with id '${skillId}' not found`);
    }

    await this.persistedProvider.delete(skillId);
    return true;
  }

  async resolveSkillSelection(selection: SkillSelection[]): Promise<InternalSkillDefinition[]> {
    if (!selection || selection.length === 0) {
      return [];
    }

    const result: InternalSkillDefinition[] = [];
    const seenIds = new Set<string>();

    for (const sel of selection) {
      for (const skillId of sel.skill_ids) {
        if (skillId === allSkillsSelectionWildcard) {
          const allSkills = await this.listSkillDefinitions();
          for (const skill of allSkills) {
            if (!seenIds.has(skill.id)) {
              seenIds.add(skill.id);
              result.push(skill);
            }
          }
        } else if (!seenIds.has(skillId)) {
          const skill = await this.get(skillId);
          if (skill) {
            seenIds.add(skillId);
            result.push(skill);
          }
        }
      }
    }

    return result;
  }

  private static readonly MAX_TOOL_IDS_PER_SKILL = 5;

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
