/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  BULK_FILTER_MAX_RULES,
  createRuleDataSchema,
  updateRuleDataSchema,
} from '@kbn/alerting-v2-schemas';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import type { HttpServiceStart, KibanaRequest } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { KibanaRequest as CoreKibanaRequest } from '@kbn/core/server';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { inject, injectable } from 'inversify';

import { type RuleSavedObjectAttributes } from '../../saved_objects';
import { ALERTING_RULE_EXECUTOR_TASK_TYPE } from '../rule_executor';
import { ensureRuleExecutorTaskScheduled, getRuleExecutorTaskId } from '../rule_executor/schedule';
import type { RuleExecutorTaskParams } from '../rule_executor/types';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';
import { RulesSavedObjectServiceScopedToken } from '../services/rules_saved_object_service/tokens';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import type {
  BulkOperationError,
  BulkOperationResponse,
  BulkRulesParams,
  CreateRuleParams,
  FindRulesSortField,
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
import { buildRuleSoFilter } from './build_rule_filter';
import { buildFindRulesSearch } from './build_rule_search';
import { withApm as withApmDecorator } from '../apm/with_apm_decorator';

const withApm = withApmDecorator('RulesClient');

type ResolveRuleIdsResult =
  | { ids: string[]; usedFilter: false }
  | {
      ids: string[];
      usedFilter: true;
      truncated: boolean;
      totalMatched: number;
    };

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const mapSortField = (sortField?: FindRulesSortField): string | undefined => {
  if (!sortField) {
    return undefined;
  }

  const sortFieldMap: Record<FindRulesSortField, string> = {
    kind: 'kind',
    enabled: 'enabled',
    name: 'metadata.name.keyword',
  };

  return sortFieldMap[sortField];
};

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

  @withApm
  public async getTags(): Promise<string[]> {
    return this.rulesSavedObjectService.findTags();
  }

  @withApm
  public async findRules(params: FindRulesParams = {}): Promise<FindRulesResponse> {
    const page = params.page ?? DEFAULT_PAGE;
    const perPage = params.perPage ?? DEFAULT_PER_PAGE;
    const filter = buildFindRulesSearch({ filter: params.filter, search: params.search });
    const sortField = mapSortField(params.sortField);

    const res = await this.rulesSavedObjectService.find({
      page,
      perPage,
      filter,
      sortField,
      sortOrder: params.sortOrder,
    });

    return {
      items: res.saved_objects.map((so) =>
        transformRuleSoAttributesToRuleApiResponse(so.id, so.attributes)
      ),
      total: res.total,
      page,
      perPage,
    };
  }

  /**
   * Resolves rule IDs from a BulkRulesParams. If `ids` are provided directly,
   * returns them. If a `filter` is provided, pages matching rules and collects
   * IDs up to {@link BULK_FILTER_MAX_RULES}.
   */
  private async resolveRuleIds(params: BulkRulesParams): Promise<ResolveRuleIdsResult> {
    if (params.ids && params.filter) {
      throw Boom.badRequest('Only one of ids or filter can be provided');
    }

    if (params.ids) {
      return { ids: params.ids, usedFilter: false };
    }

    const soFilter = params.filter ? buildRuleSoFilter(params.filter) : undefined;
    const allIds: string[] = [];
    let currentPage = 1;
    const pageSize = 100;
    let totalMatched = 0;

    while (true) {
      const res = await this.rulesSavedObjectService.find({
        page: currentPage,
        perPage: pageSize,
        filter: soFilter,
      });

      if (currentPage === 1) {
        totalMatched = res.total;
      }

      for (const so of res.saved_objects) {
        if (allIds.length >= BULK_FILTER_MAX_RULES) {
          break;
        }
        allIds.push(so.id);
      }

      if (allIds.length >= BULK_FILTER_MAX_RULES) {
        break;
      }

      if (allIds.length >= res.total) {
        break;
      }
      currentPage++;
    }

    const truncated = totalMatched > BULK_FILTER_MAX_RULES;

    return {
      ids: allIds,
      usedFilter: true,
      truncated,
      totalMatched,
    };
  }

  private bulkFilterResponseFields(
    resolution: ResolveRuleIdsResult
  ): Pick<BulkOperationResponse, 'truncated' | 'totalMatched'> {
    if (!resolution.usedFilter || !resolution.truncated) {
      return {};
    }
    return { truncated: true, totalMatched: resolution.totalMatched };
  }

  @withApm
  public async bulkDeleteRules(params: BulkRulesParams): Promise<BulkOperationResponse> {
    const { spaceId } = this.getSpaceContext();
    const errors: BulkOperationError[] = [];
    const resolution = await this.resolveRuleIds(params);
    const { ids } = resolution;

    if (ids.length === 0) {
      return { rules: [], errors: [] };
    }

    // Remove associated task manager tasks (best-effort)
    const taskIds = ids.map((id) => getRuleExecutorTaskId({ ruleId: id, spaceId }));
    try {
      await this.taskManager.bulkRemove(taskIds);
    } catch {
      // Task removal failures are non-fatal; continue with SO deletion.
    }

    const deleteResults = await this.rulesSavedObjectService.bulkDelete(ids);
    for (const result of deleteResults) {
      if (!result.success) {
        errors.push({
          id: result.id,
          error: {
            message: result.error.message,
            statusCode: result.error.statusCode,
          },
        });
      }
    }

    return { rules: [], errors, ...this.bulkFilterResponseFields(resolution) };
  }

  @withApm
  public async bulkEnableRules(params: BulkRulesParams): Promise<BulkOperationResponse> {
    const { spaceId } = this.getSpaceContext();
    const errors: BulkOperationError[] = [];
    const rules: RuleResponse[] = [];
    const resolution = await this.resolveRuleIds(params);
    const { ids } = resolution;

    if (ids.length === 0) {
      return { rules: [], errors: [] };
    }

    const fetchResults = await this.rulesSavedObjectService.bulkGetByIds(ids);

    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const nowIso = new Date().toISOString();

    const itemsToUpdate: Array<{
      id: string;
      attrs: RuleSavedObjectAttributes;
      version?: string;
    }> = [];

    for (const doc of fetchResults) {
      if ('error' in doc) {
        errors.push({
          id: doc.id,
          error: { message: doc.error.message, statusCode: doc.error.statusCode },
        });
        continue;
      }

      if (doc.attributes.enabled) {
        // Already enabled — include in response without updating
        rules.push(transformRuleSoAttributesToRuleApiResponse(doc.id, doc.attributes));
        continue;
      }

      const nextAttrs: RuleSavedObjectAttributes = {
        ...doc.attributes,
        enabled: true,
        updatedBy: userProfileUid,
        updatedAt: nowIso,
      };

      itemsToUpdate.push({ id: doc.id, attrs: nextAttrs, version: doc.version });
    }

    if (itemsToUpdate.length > 0) {
      const updateResults = await this.rulesSavedObjectService.bulkUpdate(itemsToUpdate);

      const tasksToSchedule: Array<{
        id: string;
        taskType: string;
        schedule: { interval: string };
        params: RuleExecutorTaskParams;
        state: Record<string, unknown>;
        scope: string[];
        enabled: boolean;
      }> = [];

      for (let i = 0; i < updateResults.length; i++) {
        const updateResult = updateResults[i];
        const item = itemsToUpdate[i];

        if (!updateResult.success) {
          errors.push({
            id: updateResult.id,
            error: {
              message: updateResult.error.message,
              statusCode: updateResult.error.statusCode,
            },
          });
          continue;
        }

        rules.push(transformRuleSoAttributesToRuleApiResponse(item.id, item.attrs));

        tasksToSchedule.push({
          id: getRuleExecutorTaskId({ ruleId: item.id, spaceId }),
          taskType: ALERTING_RULE_EXECUTOR_TASK_TYPE,
          schedule: { interval: item.attrs.schedule.every },
          params: { ruleId: item.id, spaceId },
          state: {},
          scope: ['alerting'],
          enabled: true,
        });
      }

      if (tasksToSchedule.length > 0) {
        try {
          await this.taskManager.bulkSchedule(tasksToSchedule, {
            request: this.request as unknown as CoreKibanaRequest,
          });
        } catch {
          // Task scheduling failure is non-fatal for bulk operations
        }
      }
    }

    return { rules, errors, ...this.bulkFilterResponseFields(resolution) };
  }

  @withApm
  public async bulkDisableRules(params: BulkRulesParams): Promise<BulkOperationResponse> {
    const { spaceId } = this.getSpaceContext();
    const errors: BulkOperationError[] = [];
    const rules: RuleResponse[] = [];
    const resolution = await this.resolveRuleIds(params);
    const { ids } = resolution;

    if (ids.length === 0) {
      return { rules: [], errors: [] };
    }

    const fetchResults = await this.rulesSavedObjectService.bulkGetByIds(ids);

    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const nowIso = new Date().toISOString();

    const itemsToUpdate: Array<{
      id: string;
      attrs: RuleSavedObjectAttributes;
      version?: string;
    }> = [];

    for (const doc of fetchResults) {
      if ('error' in doc) {
        errors.push({
          id: doc.id,
          error: { message: doc.error.message, statusCode: doc.error.statusCode },
        });
        continue;
      }

      if (!doc.attributes.enabled) {
        // Already disabled — include in response without updating
        rules.push(transformRuleSoAttributesToRuleApiResponse(doc.id, doc.attributes));
        continue;
      }

      const nextAttrs: RuleSavedObjectAttributes = {
        ...doc.attributes,
        enabled: false,
        updatedBy: userProfileUid,
        updatedAt: nowIso,
      };

      itemsToUpdate.push({ id: doc.id, attrs: nextAttrs, version: doc.version });
    }

    if (itemsToUpdate.length > 0) {
      const updateResults = await this.rulesSavedObjectService.bulkUpdate(itemsToUpdate);

      for (let i = 0; i < updateResults.length; i++) {
        const updateResult = updateResults[i];
        const item = itemsToUpdate[i];

        if (!updateResult.success) {
          errors.push({
            id: updateResult.id,
            error: {
              message: updateResult.error.message,
              statusCode: updateResult.error.statusCode,
            },
          });
          continue;
        }

        rules.push(transformRuleSoAttributesToRuleApiResponse(item.id, item.attrs));
      }
    }

    // Disable tasks for the successfully disabled rules (best-effort)
    const disabledTaskIds = itemsToUpdate
      .filter((item) => !errors.some((e) => e.id === item.id))
      .map((item) => getRuleExecutorTaskId({ ruleId: item.id, spaceId }));

    if (disabledTaskIds.length > 0) {
      try {
        await this.taskManager.bulkDisable(disabledTaskIds);
      } catch {
        // Task disable failure is non-fatal for bulk operations
      }
    }

    return { rules, errors, ...this.bulkFilterResponseFields(resolution) };
  }
}
