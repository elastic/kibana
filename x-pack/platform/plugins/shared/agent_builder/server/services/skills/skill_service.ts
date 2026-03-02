/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { PersistedSkillCreateRequest, PersistedSkillUpdateRequest } from '@kbn/agent-builder-common';
import { getCurrentSpaceId } from '../../utils/spaces';
import { getSkillEntryPath } from '../runner/store/volumes/skills/utils';
import { createSkillRegistry } from './skill_registry';
import type { SkillRegistry } from './skill_registry';
import { createBuiltinSkillProvider } from './builtin';
import { createPersistedSkillProvider } from './persisted';
import type { AuditLogService } from '../../audit';
import { asError } from '../../utils/as_error';

export interface SkillServiceSetup {
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
   * Create a persisted skill and log the operation for audit.
   */
  createSkill(
    request: KibanaRequest,
    createRequest: PersistedSkillCreateRequest
  ): Promise<Awaited<ReturnType<SkillRegistry['create']>>>;

  /**
   * Update a persisted skill and log the operation for audit.
   */
  updateSkill(
    request: KibanaRequest,
    skillId: string,
    update: PersistedSkillUpdateRequest
  ): Promise<Awaited<ReturnType<SkillRegistry['update']>>>;

  /**
   * Delete a persisted skill and log the operation for audit.
   */
  deleteSkill(request: KibanaRequest, skillId: string): Promise<void>;

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
  auditLogService: AuditLogService;
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
    auditLogService,
  }: SkillServiceStartDeps): SkillServiceStart {
    const validated = Promise.all(
      [...this.skills.values()].map((skill) => validateSkillDefinition(skill))
    );

    const getRegistry = async ({ request }: { request: KibanaRequest }) => {
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
    };

    return {
      getRegistry,
      createSkill: async (request, createRequest) => {
        const registry = await getRegistry({ request });
        try {
          const skill = await registry.create(createRequest);
          auditLogService.logSkillCreated(request, {
            skillId: skill.id,
            skillName: skill.name,
          });
          return skill;
        } catch (error) {
          auditLogService.logSkillCreated(request, {
            skillId: createRequest.id,
            skillName: createRequest.name,
            error: asError(error),
          });
          throw error;
        }
      },
      updateSkill: async (request, skillId, update) => {
        const registry = await getRegistry({ request });
        try {
          const skill = await registry.update(skillId, update);
          auditLogService.logSkillUpdated(request, {
            skillId: skill.id,
            skillName: skill.name,
          });
          return skill;
        } catch (error) {
          auditLogService.logSkillUpdated(request, {
            skillId,
            error: asError(error),
          });
          throw error;
        }
      },
      deleteSkill: async (request, skillId) => {
        const registry = await getRegistry({ request });
        try {
          const skill = await registry.get(skillId);
          await registry.delete(skillId);
          auditLogService.logSkillDeleted(request, {
            skillId: skill.id,
            skillName: skill.name,
          });
        } catch (error) {
          auditLogService.logSkillDeleted(request, {
            skillId,
            error: asError(error),
          });
          throw error;
        }
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
