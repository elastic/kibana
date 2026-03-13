/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createRuleDataSchema, updateRuleDataSchema } from '@kbn/alerting-v2-schemas';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import type { HttpServiceStart, KibanaRequest } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { KibanaRequest as CoreKibanaRequest } from '@kbn/core/server';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { stringifyZodError } from '@kbn/zod-helpers';
import { inject, injectable } from 'inversify';

import { type RuleSavedObjectAttributes } from '../../saved_objects';
import { ensureRuleExecutorTaskScheduled, getRuleExecutorTaskId } from '../rule_executor/schedule';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';
import { RulesSavedObjectServiceScopedToken } from '../services/rules_saved_object_service/tokens';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import type {
  CreateRuleParams,
  FindRulesParams,
  FindRulesResponse,
  RuleResponse,
  UpdateRuleData,
} from './types';
import {
  transformCreateRuleBodyToRuleSoAttributes,
  transformRuleSoAttributesToRuleApiResponse,
  buildUpdateRuleAttributes,
} from './utils';
import { withApm as withApmDecorator } from '../apm/with_apm_decorator';

const withApm = withApmDecorator('RulesClient');

@injectable()
export class RulesClient {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(CoreStart('http')) private readonly http: HttpServiceStart,
    @inject(RulesSavedObjectServiceScopedToken)
    private readonly rulesSavedObjectService: RulesSavedObjectServiceContract,
    @inject(PluginStart('taskManager')) private readonly taskManager: TaskManagerStartContract,
    @inject(UserService) private readonly userService: UserServiceContract
  ) {}

  private getSpaceContext(): { spaceId: string } {
    const requestBasePath = this.http.basePath.get(this.request);
    const space = getSpaceIdFromPath(requestBasePath, this.http.basePath.serverBasePath);
    const spaceId = space?.spaceId || 'default';
    return { spaceId };
  }

  @withApm
  public async createRule(params: CreateRuleParams): Promise<RuleResponse> {
    const { spaceId } = this.getSpaceContext();

    const parsed = createRuleDataSchema.safeParse(params.data);
    if (!parsed.success) {
      throw Boom.badRequest(
        `Error validating create rule data - ${stringifyZodError(parsed.error)}`
      );
    }

    const username = await this.userService.getCurrentUsername();
    const nowIso = new Date().toISOString();

    const ruleAttributes = transformCreateRuleBodyToRuleSoAttributes(parsed.data, {
      enabled: true,
      createdBy: username,
      createdAt: nowIso,
      updatedBy: username,
      updatedAt: nowIso,
    });

    let id: string;
    try {
      id = await this.rulesSavedObjectService.create({
        attrs: ruleAttributes,
        id: params.options?.id,
      });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        const conflictId = params.options?.id ?? 'unknown';
        throw Boom.conflict(`Rule with id "${conflictId}" already exists`);
      }
      throw e;
    }

    try {
      await ensureRuleExecutorTaskScheduled({
        services: { taskManager: this.taskManager },
        input: {
          ruleId: id,
          spaceId,
          schedule: { interval: ruleAttributes.schedule.every },
          request: this.request as unknown as CoreKibanaRequest,
        },
      });
    } catch (e) {
      await this.rulesSavedObjectService.delete({ id }).catch(() => {});
      throw e;
    }

    return transformRuleSoAttributesToRuleApiResponse(id, ruleAttributes);
  }

  @withApm
  public async updateRule({
    id,
    data,
  }: {
    id: string;
    data: UpdateRuleData;
  }): Promise<RuleResponse> {
    const { spaceId } = this.getSpaceContext();

    const parsed = updateRuleDataSchema.safeParse(data);
    if (!parsed.success) {
      throw Boom.badRequest(
        `Error validating update rule data - ${stringifyZodError(parsed.error)}`
      );
    }

    const username = await this.userService.getCurrentUsername();
    const nowIso = new Date().toISOString();

    let existingAttrs: RuleSavedObjectAttributes;
    let existingVersion: string | undefined;
    try {
      const doc = await this.rulesSavedObjectService.get(id);
      existingAttrs = doc.attributes;
      existingVersion = doc.version;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Rule with id "${id}" not found`);
      }
      throw e;
    }

    if (existingAttrs.kind !== 'alert' && parsed.data.state_transition != null) {
      throw Boom.badRequest('stateTransition is only allowed for rules of kind "alert".');
    }

    const nextAttrs = buildUpdateRuleAttributes(existingAttrs, parsed.data, {
      updatedBy: username,
      updatedAt: nowIso,
    });

    // Ensure the task schedule is up-to-date.
    await ensureRuleExecutorTaskScheduled({
      services: { taskManager: this.taskManager },
      input: {
        ruleId: id,
        spaceId,
        schedule: { interval: nextAttrs.schedule.every },
        request: this.request as unknown as CoreKibanaRequest,
      },
    });

    try {
      await this.rulesSavedObjectService.update({
        id,
        attrs: nextAttrs,
        version: existingVersion,
      });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(`Rule with id "${id}" has already been updated by another user`);
      }
      throw e;
    }

    return transformRuleSoAttributesToRuleApiResponse(id, nextAttrs);
  }

  @withApm
  public async getRule({ id }: { id: string }): Promise<RuleResponse> {
    try {
      const doc = await this.rulesSavedObjectService.get(id);
      return transformRuleSoAttributesToRuleApiResponse(id, doc.attributes);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Rule with id "${id}" not found`);
      }
      throw e;
    }
  }

  @withApm
  public async getRules(ids: string[]): Promise<RuleResponse[]> {
    const result = await this.rulesSavedObjectService.bulkGetByIds(ids);

    return result.flatMap((doc) => {
      if ('error' in doc) {
        return [];
      }

      return [transformRuleSoAttributesToRuleApiResponse(doc.id, doc.attributes)];
    });
  }

  @withApm
  public async deleteRule({ id }: { id: string }): Promise<void> {
    const { spaceId } = this.getSpaceContext();

    try {
      await this.rulesSavedObjectService.get(id);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Rule with id "${id}" not found`);
      }
      throw e;
    }

    const taskId = getRuleExecutorTaskId({ ruleId: id, spaceId });
    await this.taskManager.removeIfExists(taskId);

    await this.rulesSavedObjectService.delete({ id });
  }

  @withApm
  public async enableRule({ id }: { id: string }): Promise<RuleResponse> {
    const { spaceId } = this.getSpaceContext();

    const username = await this.userService.getCurrentUsername();
    const nowIso = new Date().toISOString();

    let existingAttrs: RuleSavedObjectAttributes;
    let existingVersion: string | undefined;
    try {
      const doc = await this.rulesSavedObjectService.get(id);
      existingAttrs = doc.attributes;
      existingVersion = doc.version;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Rule with id "${id}" not found`);
      }
      throw e;
    }

    const nextAttrs: RuleSavedObjectAttributes = {
      ...existingAttrs,
      enabled: true,
      updatedBy: username,
      updatedAt: nowIso,
    };

    // Ensure the task schedule is up-to-date.
    await ensureRuleExecutorTaskScheduled({
      services: { taskManager: this.taskManager },
      input: {
        ruleId: id,
        spaceId,
        schedule: { interval: nextAttrs.schedule.every },
        request: this.request as unknown as CoreKibanaRequest,
      },
    });

    try {
      await this.rulesSavedObjectService.update({
        id,
        attrs: nextAttrs,
        version: existingVersion,
      });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(`Rule with id "${id}" has already been updated by another user`);
      }
      throw e;
    }

    return transformRuleSoAttributesToRuleApiResponse(id, nextAttrs);
  }

  @withApm
  public async disableRule({ id }: { id: string }): Promise<RuleResponse> {
    const { spaceId } = this.getSpaceContext();

    const username = await this.userService.getCurrentUsername();
    const nowIso = new Date().toISOString();

    let existingAttrs: RuleSavedObjectAttributes;
    let existingVersion: string | undefined;
    try {
      const doc = await this.rulesSavedObjectService.get(id);
      existingAttrs = doc.attributes;
      existingVersion = doc.version;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Rule with id "${id}" not found`);
      }
      throw e;
    }

    const nextAttrs: RuleSavedObjectAttributes = {
      ...existingAttrs,
      enabled: false,
      updatedBy: username,
      updatedAt: nowIso,
    };

    // When disabling, remove the task.
    const taskId = getRuleExecutorTaskId({ ruleId: id, spaceId });
    await this.taskManager.removeIfExists(taskId);

    try {
      await this.rulesSavedObjectService.update({
        id,
        attrs: nextAttrs,
        version: existingVersion,
      });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(`Rule with id "${id}" has already been updated by another user`);
      }
      throw e;
    }

    return transformRuleSoAttributesToRuleApiResponse(id, nextAttrs);
  }

  public async findRules(params: FindRulesParams = {}): Promise<FindRulesResponse> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;

    const res = await this.rulesSavedObjectService.find({ page, perPage });

    return {
      items: res.saved_objects.map((so) =>
        transformRuleSoAttributesToRuleApiResponse(so.id, so.attributes)
      ),
      total: res.total,
      page,
      perPage,
    };
  }
}
