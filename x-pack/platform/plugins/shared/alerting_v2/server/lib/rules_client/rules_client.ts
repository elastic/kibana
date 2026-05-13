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
  isStateTransitionAllowed,
  updateRuleDataSchema,
} from '@kbn/alerting-v2-schemas';
import type { KibanaRequest } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { KibanaRequest as CoreKibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import type { z } from '@kbn/zod/v4';
import { type RuleSavedObjectAttributes } from '../../saved_objects';
import { type ActionPolicyClient } from '../action_policy_client';
import { withApm as withApmDecorator } from '../apm/with_apm_decorator';
import { ALERTING_RULE_EXECUTOR_TASK_TYPE } from '../rule_executor';
import { ensureRuleExecutorTaskScheduled, getRuleExecutorTaskId } from '../rule_executor/schedule';
import type { RuleExecutorTaskParams } from '../rule_executor/types';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';
import type { UserServiceContract } from '../services/user_service/user_service';
import { buildRuleSoFilter } from './build_rule_filter';
import { buildSoSearch, RULE_SEARCH_FIELDS } from './build_so_search';
import type {
  BulkOperationError,
  BulkOperationResponse,
  BulkRulesParams,
  CreateRuleData,
  CreateRuleParams,
  FindRulesParams,
  FindRulesResponse,
  FindRulesSortField,
  RuleResponse,
  UpdateRuleData,
} from './types';
import {
  assertImmutableUnchanged,
  buildUpdateRuleAttributes,
  transformCreateRuleBodyToRuleSoAttributes,
  transformRuleSoAttributesToRuleApiResponse,
} from './utils';

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

interface RulesClientParams {
  services: {
    request: KibanaRequest;
    rulesSavedObjectService: RulesSavedObjectServiceContract;
    taskManager: TaskManagerStartContract;
    userService: UserServiceContract;
    actionPolicyClient: ActionPolicyClient;
  };
  options: {
    spaceId: string;
  };
}

export class RulesClient {
  private readonly request: KibanaRequest;
  private readonly rulesSavedObjectService: RulesSavedObjectServiceContract;
  private readonly taskManager: TaskManagerStartContract;
  private readonly userService: UserServiceContract;
  private readonly actionPolicyClient: ActionPolicyClient;
  private readonly spaceId: string;

  constructor({ services, options }: RulesClientParams) {
    this.request = services.request;
    this.rulesSavedObjectService = services.rulesSavedObjectService;
    this.taskManager = services.taskManager;
    this.userService = services.userService;
    this.actionPolicyClient = services.actionPolicyClient;
    this.spaceId = options.spaceId;
  }

  private getSpaceContext(): { spaceId: string } {
    return { spaceId: this.spaceId };
  }

  private parseRuleData<T>(
    schema: z.ZodType<T>,
    data: unknown,
    context: 'create' | 'update' | 'upsert'
  ): T {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw Boom.badRequest(
        `Error validating ${context} rule data - ${stringifyZodError(parsed.error)}`
      );
    }
    return parsed.data;
  }

  private async getExistingRule(
    id: string
  ): Promise<{ attrs: RuleSavedObjectAttributes; version: string | undefined }> {
    try {
      const doc = await this.rulesSavedObjectService.get(id);
      return { attrs: doc.attributes, version: doc.version };
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Rule with id "${id}" not found`);
      }
      throw e;
    }
  }

  private async scheduleRuleExecutorTask({
    ruleId,
    spaceId,
    scheduleEvery,
  }: {
    ruleId: string;
    spaceId: string;
    scheduleEvery: string;
  }): Promise<void> {
    await ensureRuleExecutorTaskScheduled({
      services: { taskManager: this.taskManager },
      input: {
        ruleId,
        spaceId,
        schedule: { interval: scheduleEvery },
        request: this.request as unknown as CoreKibanaRequest,
      },
    });
  }

  private async writeRuleAttrs({
    id,
    attrs,
    version,
  }: {
    id: string;
    attrs: RuleSavedObjectAttributes;
    version?: string;
  }): Promise<void> {
    try {
      await this.rulesSavedObjectService.update({ id, attrs, version });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(`Rule with id "${id}" has already been updated by another user`);
      }
      throw e;
    }
  }

  @withApm
  public async createRule(params: CreateRuleParams): Promise<RuleResponse> {
    const { spaceId } = this.getSpaceContext();
    const parsed = this.parseRuleData(createRuleDataSchema, params.data, 'create');

    const username = await this.userService.getCurrentUsername();
    const nowIso = new Date().toISOString();

    const ruleAttributes = transformCreateRuleBodyToRuleSoAttributes(parsed, {
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
      await this.scheduleRuleExecutorTask({
        ruleId: id,
        spaceId,
        scheduleEvery: ruleAttributes.schedule.every,
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
    const parsed = this.parseRuleData(updateRuleDataSchema, data, 'update');

    const username = await this.userService.getCurrentUsername();
    const nowIso = new Date().toISOString();

    const { attrs: existingAttrs, version: existingVersion } = await this.getExistingRule(id);

    if (
      !isStateTransitionAllowed({
        kind: existingAttrs.kind,
        state_transition: parsed.state_transition,
      })
    ) {
      throw Boom.badRequest('stateTransition is only allowed for rules of kind "alert".');
    }

    const nextAttrs = buildUpdateRuleAttributes(existingAttrs, parsed, {
      updatedBy: username,
      updatedAt: nowIso,
    });

    await this.scheduleRuleExecutorTask({
      ruleId: id,
      spaceId,
      scheduleEvery: nextAttrs.schedule.every,
    });

    await this.writeRuleAttrs({ id, attrs: nextAttrs, version: existingVersion });

    return transformRuleSoAttributesToRuleApiResponse(id, nextAttrs);
  }

  @withApm
  public async getRule({ id }: { id: string }): Promise<RuleResponse> {
    const { attrs } = await this.getExistingRule(id);
    return transformRuleSoAttributesToRuleApiResponse(id, attrs);
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
  public async ruleExists({ id }: { id: string }): Promise<boolean> {
    try {
      await this.getExistingRule(id);
      return true;
    } catch (e) {
      if (Boom.isBoom(e) && e.output.statusCode === 404) {
        return false;
      }
      throw e;
    }
  }

  @withApm
  public async deleteRule({ id }: { id: string }): Promise<void> {
    const { spaceId } = this.getSpaceContext();

    if (!(await this.ruleExists({ id }))) {
      throw Boom.notFound(`Rule with id "${id}" not found`);
    }

    const taskId = getRuleExecutorTaskId({ ruleId: id, spaceId });
    await this.taskManager.removeIfExists(taskId);

    await this.rulesSavedObjectService.delete({ id });

    await this.actionPolicyClient.deleteActionPoliciesByFilter({
      type: 'single_rule',
      ruleId: id,
    });
  }

  @withApm
  public async enableRule({ id }: { id: string }): Promise<RuleResponse> {
    const { spaceId } = this.getSpaceContext();

    const username = await this.userService.getCurrentUsername();
    const nowIso = new Date().toISOString();

    const { attrs: existingAttrs, version: existingVersion } = await this.getExistingRule(id);

    const nextAttrs: RuleSavedObjectAttributes = {
      ...existingAttrs,
      enabled: true,
      updatedBy: username,
      updatedAt: nowIso,
    };

    await this.scheduleRuleExecutorTask({
      ruleId: id,
      spaceId,
      scheduleEvery: nextAttrs.schedule.every,
    });

    await this.writeRuleAttrs({ id, attrs: nextAttrs, version: existingVersion });

    return transformRuleSoAttributesToRuleApiResponse(id, nextAttrs);
  }

  @withApm
  public async disableRule({ id }: { id: string }): Promise<RuleResponse> {
    const { spaceId } = this.getSpaceContext();

    const username = await this.userService.getCurrentUsername();
    const nowIso = new Date().toISOString();

    const { attrs: existingAttrs, version: existingVersion } = await this.getExistingRule(id);

    const nextAttrs: RuleSavedObjectAttributes = {
      ...existingAttrs,
      enabled: false,
      updatedBy: username,
      updatedAt: nowIso,
    };

    const taskId = getRuleExecutorTaskId({ ruleId: id, spaceId });
    await this.taskManager.removeIfExists(taskId);

    await this.writeRuleAttrs({ id, attrs: nextAttrs, version: existingVersion });

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
    const soFilter = params.filter ? buildRuleSoFilter(params.filter) : undefined;
    const search = buildSoSearch(params.search);
    const sortField = mapSortField(params.sortField);

    const res = await this.rulesSavedObjectService.find({
      page,
      perPage,
      filter: soFilter,
      search,
      searchFields: search ? RULE_SEARCH_FIELDS : undefined,
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
    if (params.ids && (params.filter || params.search)) {
      throw Boom.badRequest('ids cannot be combined with filter or search');
    }

    if (params.ids) {
      return { ids: params.ids, usedFilter: false };
    }

    const soFilter = params.filter ? buildRuleSoFilter(params.filter) : undefined;
    const search = buildSoSearch(params.search);
    const allIds: string[] = [];
    let currentPage = 1;
    const pageSize = 100;
    let totalMatched = 0;

    while (true) {
      const res = await this.rulesSavedObjectService.find({
        page: currentPage,
        perPage: pageSize,
        filter: soFilter,
        search,
        searchFields: search ? RULE_SEARCH_FIELDS : undefined,
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

  @withApm
  public async upsertRule({
    id,
    data,
  }: {
    id: string;
    data: CreateRuleData;
  }): Promise<{ rule: RuleResponse; created: boolean }> {
    const parsed = this.parseRuleData(createRuleDataSchema, data, 'upsert');

    const exists = await this.ruleExists({ id });

    if (!exists) {
      const rule = await this.createRule({ data, options: { id } });
      return { rule, created: true };
    }

    const { spaceId } = this.getSpaceContext();
    const username = await this.userService.getCurrentUsername();
    const nowIso = new Date().toISOString();

    const { attrs: existingAttrs, version: existingVersion } = await this.getExistingRule(id);

    assertImmutableUnchanged(parsed, existingAttrs);

    const nextAttrs = transformCreateRuleBodyToRuleSoAttributes(parsed, {
      enabled: existingAttrs.enabled,
      createdBy: existingAttrs.createdBy,
      createdAt: existingAttrs.createdAt,
      updatedBy: username,
      updatedAt: nowIso,
    });

    await this.scheduleRuleExecutorTask({
      ruleId: id,
      spaceId,
      scheduleEvery: nextAttrs.schedule.every,
    });

    await this.writeRuleAttrs({ id, attrs: nextAttrs, version: existingVersion });

    return {
      rule: transformRuleSoAttributesToRuleApiResponse(id, nextAttrs),
      created: false,
    };
  }
}
