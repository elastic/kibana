/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core/server';
import type {
  KibanaRequest as CoreKibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { HttpServiceStart, KibanaRequest } from '@kbn/core-http-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { inject, injectable } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';

import { RULE_SAVED_OBJECT_TYPE, type RuleSavedObjectAttributes } from '../../saved_objects';
import { ensureRuleExecutorTaskScheduled, getRuleExecutorTaskId } from '../rule_executor/schedule';
import { createRuleDataSchema, updateRuleDataSchema } from './schemas';
import type {
  CreateRuleParams,
  FindRulesParams,
  FindRulesResponse,
  RuleResponse,
  UpdateRuleData,
} from './types';

@injectable()
export class RulesClient {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(CoreStart('http')) private readonly http: HttpServiceStart,
    @inject(CoreStart('savedObjects')) private readonly savedObjects: SavedObjectsServiceStart,
    @inject(PluginStart('taskManager')) private readonly taskManager: TaskManagerStartContract,
    @inject(PluginStart('security')) private readonly security: SecurityPluginStart
  ) {}

  private getSpaceContext(): { spaceId: string } {
    const requestBasePath = this.http.basePath.get(this.request);
    const space = getSpaceIdFromPath(requestBasePath, this.http.basePath.serverBasePath);
    const spaceId = space?.spaceId || 'default';
    return { spaceId };
  }

  private getSavedObjectsClient(): SavedObjectsClientContract {
    return this.savedObjects.getScopedClient(this.request, {
      includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
    });
  }

  private async getUserName(): Promise<string | null> {
    return this.security.authc.getCurrentUser(this.request)?.username ?? null;
  }

  public async createRule(params: CreateRuleParams): Promise<RuleResponse> {
    const savedObjectsClient = this.getSavedObjectsClient();
    const { spaceId } = this.getSpaceContext();

    try {
      createRuleDataSchema.validate(params.data);
    } catch (error) {
      throw Boom.badRequest(`Error validating create rule data - ${(error as Error).message}`);
    }

    const id = params.options?.id ?? SavedObjectsUtils.generateId();
    const username = await this.getUserName();
    const nowIso = new Date().toISOString();

    const ruleAttributes: RuleSavedObjectAttributes = {
      name: params.data.name,
      tags: params.data.tags ?? [],
      schedule: params.data.schedule,
      enabled: params.data.enabled,
      query: params.data.query,
      timeField: params.data.timeField,
      lookbackWindow: params.data.lookbackWindow,
      groupingKey: params.data.groupingKey ?? [],
      createdBy: username,
      createdAt: nowIso,
      updatedBy: username,
      updatedAt: nowIso,
    };

    try {
      await savedObjectsClient.create<RuleSavedObjectAttributes>(
        RULE_SAVED_OBJECT_TYPE,
        ruleAttributes,
        {
          id,
          overwrite: false,
        }
      );
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(`Rule with id "${id}" already exists`);
      }
      throw e;
    }

    if (ruleAttributes.enabled) {
      try {
        await ensureRuleExecutorTaskScheduled({
          services: { taskManager: this.taskManager },
          input: {
            ruleId: id,
            spaceId,
            schedule: { interval: ruleAttributes.schedule.custom },
            request: this.request as unknown as CoreKibanaRequest,
          },
        });
      } catch (e) {
        await savedObjectsClient.delete(RULE_SAVED_OBJECT_TYPE, id).catch(() => {});
        throw e;
      }
    }

    // Keep response shape identical to the previous method implementation.
    return { id, ...ruleAttributes };
  }

  public async updateRule({
    id,
    data,
  }: {
    id: string;
    data: UpdateRuleData;
  }): Promise<RuleResponse> {
    const savedObjectsClient = this.getSavedObjectsClient();
    const { spaceId } = this.getSpaceContext();

    try {
      updateRuleDataSchema.validate(data);
    } catch (error) {
      throw Boom.badRequest(`Error validating update rule data - ${(error as Error).message}`);
    }

    const username = await this.getUserName();
    const nowIso = new Date().toISOString();

    let existingAttrs: RuleSavedObjectAttributes;
    let existingVersion: string | undefined;
    try {
      const doc = await savedObjectsClient.get<RuleSavedObjectAttributes>(
        RULE_SAVED_OBJECT_TYPE,
        id
      );
      existingAttrs = doc.attributes;
      existingVersion = doc.version;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Rule with id "${id}" not found`);
      }
      throw e;
    }

    const wasEnabled = Boolean(existingAttrs.enabled);
    const willBeEnabled = data.enabled !== undefined ? Boolean(data.enabled) : wasEnabled;

    const nextAttrs: RuleSavedObjectAttributes = {
      ...existingAttrs,
      ...data,
      updatedBy: username,
      updatedAt: nowIso,
    };

    // Disable transition: remove the scheduled task.
    if (wasEnabled && !willBeEnabled) {
      const taskId = getRuleExecutorTaskId({ ruleId: id, spaceId });
      await this.taskManager.removeIfExists(taskId);
    }

    // If enabled, ensure task exists and schedule is up-to-date (also handles schedule changes).
    if (willBeEnabled) {
      await ensureRuleExecutorTaskScheduled({
        services: { taskManager: this.taskManager },
        input: {
          ruleId: id,
          spaceId,
          schedule: { interval: nextAttrs.schedule.custom },
          request: this.request as unknown as CoreKibanaRequest,
        },
      });
    }

    try {
      await savedObjectsClient.update<RuleSavedObjectAttributes>(
        RULE_SAVED_OBJECT_TYPE,
        id,
        nextAttrs,
        {
          ...(existingVersion ? { version: existingVersion } : {}),
        }
      );
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(`Rule with id "${id}" has already been updated by another user`);
      }
      throw e;
    }

    return { id, ...nextAttrs };
  }

  public async getRule({ id }: { id: string }): Promise<RuleResponse> {
    const savedObjectsClient = this.getSavedObjectsClient();

    try {
      const doc = await savedObjectsClient.get<RuleSavedObjectAttributes>(
        RULE_SAVED_OBJECT_TYPE,
        id
      );
      const attrs = doc.attributes;
      return { id, ...attrs };
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Rule with id "${id}" not found`);
      }
      throw e;
    }
  }

  public async deleteRule({ id }: { id: string }): Promise<void> {
    const savedObjectsClient = this.getSavedObjectsClient();
    const { spaceId } = this.getSpaceContext();

    try {
      await savedObjectsClient.get<RuleSavedObjectAttributes>(RULE_SAVED_OBJECT_TYPE, id);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Rule with id "${id}" not found`);
      }
      throw e;
    }

    const taskId = getRuleExecutorTaskId({ ruleId: id, spaceId });
    await this.taskManager.removeIfExists(taskId);

    await savedObjectsClient.delete(RULE_SAVED_OBJECT_TYPE, id);
  }

  public async findRules(params: FindRulesParams = {}): Promise<FindRulesResponse> {
    const savedObjectsClient = this.getSavedObjectsClient();

    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;

    const res = await savedObjectsClient.find<RuleSavedObjectAttributes>({
      type: RULE_SAVED_OBJECT_TYPE,
      page,
      perPage,
      sortField: 'updatedAt',
      sortOrder: 'desc',
    });

    return {
      items: res.saved_objects.map((so) => ({
        id: so.id,
        ...so.attributes,
      })),
      total: res.total,
      page,
      perPage,
    };
  }
}
