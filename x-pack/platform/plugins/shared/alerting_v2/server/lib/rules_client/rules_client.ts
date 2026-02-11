/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { KibanaRequest as CoreKibanaRequest } from '@kbn/core/server';
import type { HttpServiceStart, KibanaRequest } from '@kbn/core-http-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { inject, injectable } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import { stringifyZodError } from '@kbn/zod-helpers';
import { createRuleDataSchema, updateRuleDataSchema } from '@kbn/alerting-v2-schemas';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';

import { type RuleSavedObjectAttributes } from '../../saved_objects';
import { ensureRuleExecutorTaskScheduled, getRuleExecutorTaskId } from '../rule_executor/schedule';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';
import { RulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import type {
  CreateRuleParams,
  FindRulesParams,
  FindRulesResponse,
  RuleResponse,
  UpdateRuleData,
} from './types';

// Conversion helpers: API ↔ SO.
// Today they are 1:1 mappings, but they give us a seam to evolve storage
// independently of the public API.

/**
 * Handles nullable fields from the update schema:
 * - `null` → `undefined` (client explicitly wants to clear the field)
 * - `undefined` → keeps the existing value
 * - anything else → uses the new value
 */
function nullToUndefined<T>(value: T | null | undefined, existing: T | undefined): T | undefined {
  if (value === null) return undefined;
  if (value === undefined) return existing;
  return value;
}

function apiCreateToSoAttributes(
  data: CreateRuleData,
  serverFields: {
    enabled: boolean;
    createdBy: string | null;
    createdAt: string;
    updatedBy: string | null;
    updatedAt: string;
  }
): RuleSavedObjectAttributes {
  return {
    kind: data.kind,
    metadata: {
      name: data.metadata.name,
      owner: data.metadata.owner,
      labels: data.metadata.labels,
      time_field: data.metadata.time_field,
    },
    schedule: {
      every: data.schedule.every,
      lookback: data.schedule.lookback,
    },
    evaluation: {
      query: {
        base: data.evaluation.query.base,
        trigger: { condition: data.evaluation.query.trigger.condition },
      },
    },
    recovery_policy: data.recovery_policy,
    state_transition: data.state_transition,
    grouping: data.grouping,
    no_data: data.no_data,
    notification_policies: data.notification_policies,
    ...serverFields,
  };
}

function soAttributesToApiResponse(id: string, attrs: RuleSavedObjectAttributes): RuleResponse {
  return {
    id,
    kind: attrs.kind,
    metadata: {
      name: attrs.metadata.name,
      owner: attrs.metadata.owner,
      labels: attrs.metadata.labels,
      time_field: attrs.metadata.time_field,
    },
    schedule: {
      every: attrs.schedule.every,
      lookback: attrs.schedule.lookback,
    },
    evaluation: {
      query: {
        base: attrs.evaluation.query.base,
        trigger: { condition: attrs.evaluation.query.trigger.condition },
      },
    },
    recovery_policy: attrs.recovery_policy,
    state_transition: attrs.state_transition,
    grouping: attrs.grouping,
    no_data: attrs.no_data,
    notification_policies: attrs.notification_policies,
    enabled: attrs.enabled,
    createdBy: attrs.createdBy,
    createdAt: attrs.createdAt,
    updatedBy: attrs.updatedBy,
    updatedAt: attrs.updatedAt,
  };
}

@injectable()
export class RulesClient {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(CoreStart('http')) private readonly http: HttpServiceStart,
    @inject(RulesSavedObjectService)
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

  public async createRule(params: CreateRuleParams): Promise<RuleResponse> {
    const { spaceId } = this.getSpaceContext();

    const parsed = createRuleDataSchema.safeParse(params.data);
    if (!parsed.success) {
      throw Boom.badRequest(
        `Error validating create rule data - ${stringifyZodError(parsed.error)}`
      );
    }

    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const nowIso = new Date().toISOString();

    const ruleAttributes = apiCreateToSoAttributes(parsed.data, {
      enabled: true,
      createdBy: userProfileUid,
      createdAt: nowIso,
      updatedBy: userProfileUid,
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

    return soAttributesToApiResponse(id, ruleAttributes);
  }

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

    const userProfileUid = await this.userService.getCurrentUserProfileUid();
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

    // Deep-merge the update into the existing attributes.
    // `null` in the update payload means "clear this optional field"; convert to `undefined`
    // so the SO schema (which uses `maybe()` / `T | undefined`) accepts it.
    const { data: updateData } = parsed;

    const nextAttrs: RuleSavedObjectAttributes = {
      ...existingAttrs,
      // Required top-level fields: merge, never clear.
      kind: updateData.kind ?? existingAttrs.kind,
      metadata: { ...existingAttrs.metadata, ...updateData.metadata },
      schedule: { ...existingAttrs.schedule, ...updateData.schedule },
      evaluation: updateData.evaluation
        ? {
            query: {
              ...existingAttrs.evaluation.query,
              ...updateData.evaluation.query,
              trigger: {
                ...existingAttrs.evaluation.query.trigger,
                ...updateData.evaluation?.query?.trigger,
              },
            },
          }
        : existingAttrs.evaluation,
      // Optional top-level fields: `null` → `undefined` (clear), `undefined` → keep existing.
      recovery_policy: nullToUndefined(updateData.recovery_policy, existingAttrs.recovery_policy),
      state_transition: nullToUndefined(
        updateData.state_transition,
        existingAttrs.state_transition
      ),
      grouping: nullToUndefined(updateData.grouping, existingAttrs.grouping),
      no_data: nullToUndefined(updateData.no_data, existingAttrs.no_data),
      notification_policies: nullToUndefined(
        updateData.notification_policies,
        existingAttrs.notification_policies
      ),
      // Server-managed fields — preserved as-is, not changeable via update.
      enabled: existingAttrs.enabled,
      createdBy: existingAttrs.createdBy,
      createdAt: existingAttrs.createdAt,
      updatedBy: userProfileUid,
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

    return soAttributesToApiResponse(id, nextAttrs);
  }

  public async getRule({ id }: { id: string }): Promise<RuleResponse> {
    try {
      const doc = await this.rulesSavedObjectService.get(id);
      return soAttributesToApiResponse(id, doc.attributes);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Rule with id "${id}" not found`);
      }
      throw e;
    }
  }

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

  public async findRules(params: FindRulesParams = {}): Promise<FindRulesResponse> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;

    const res = await this.rulesSavedObjectService.find({ page, perPage });

    return {
      items: res.saved_objects.map((so) => soAttributesToApiResponse(so.id, so.attributes)),
      total: res.total,
      page,
      perPage,
    };
  }
}
