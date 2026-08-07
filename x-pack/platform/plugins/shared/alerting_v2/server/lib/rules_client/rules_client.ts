/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  BULK_FILTER_MAX_RESOURCES,
  BULK_QUERY_SAMPLE_SIZE,
  createRuleDataSchema,
  isStateTransitionAllowed,
  updateRuleDataSchema,
} from '@kbn/alerting-v2-schemas';
import { PluginStart } from '@kbn/core-di';
import { Request, PluginInitializer } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type {
  KibanaRequest as CoreKibanaRequest,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { TaskAlreadyRunningError } from '@kbn/task-manager-plugin/server/lib/errors';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { treeifyError, type z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { type RuleSavedObjectAttributes } from '../../saved_objects';
import { withApm as withApmDecorator } from '../apm/with_apm_decorator';
import { ALERTING_V2_ERROR_CODES } from '../errors/error_codes';
import {
  getInvalidRuleDataMessage,
  getRuleAlreadyExistsMessage,
  getRuleNotFoundMessage,
  getRuleVersionConflictMessage,
} from '../errors/rule_error_messages';
import { ALERTING_RULE_EXECUTOR_TASK_TYPE } from '../rule_executor';
import { ensureRuleExecutorTaskScheduled, getRuleExecutorTaskId } from '../rule_executor/schedule';
import type { RuleExecutorTaskParams } from '../rule_executor/types';
import { RuleEventPublisher } from '../events/rule_event_publisher/rule_event_publisher';
import type { EventRule } from '../events/rule_event_publisher/rule_event_publisher';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';
import {
  RulesSavedObjectServiceInternalToken,
  RulesSavedObjectServiceScopedToken,
} from '../services/rules_saved_object_service/tokens';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import type { PluginConfig } from '../../config';
import { convertEveryToSchedulesPerMinute, parseDurationToMs } from '../duration';
import { buildRuleSoFilter } from './build_rule_filter';
import { buildSoSearch, RULE_SEARCH_FIELDS } from './build_so_search';
import type {
  BulkByIdsParams,
  BulkByQueryParams,
  BulkByQueryResult,
  BulkOperationError,
  BulkResponse,
  CreateRuleData,
  CreateRuleParams,
  FindRulesArgs,
  FindRulesResponse,
  FindRulesSortField,
  RuleResponse,
  UpdateRuleParams,
} from './types';
import {
  assertImmutableUnchanged,
  buildUpdateRuleAttributes,
  transformCreateRuleBodyToRuleSoAttributes,
  transformRuleSoAttributesToRuleApiResponse,
} from './utils';

const withApm = withApmDecorator('RulesClient');

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

/**
 * Maps a saved-object status code to the stable, machine-readable bulk-error
 * `code` returned in the response body. Keeps the by-ID and by-query
 * endpoints aligned with the single-rule error codes so a client can
 * dispatch on `error.code` uniformly.
 */
const bulkErrorCodeForStatus = (statusCode: number): string => {
  if (statusCode === 404) {
    return ALERTING_V2_ERROR_CODES.RULE_NOT_FOUND;
  }
  if (statusCode === 409) {
    return ALERTING_V2_ERROR_CODES.RULE_VERSION_CONFLICT;
  }
  return ALERTING_V2_ERROR_CODES.INTERNAL_SERVER_ERROR;
};

const toBulkError = (
  id: string,
  err: { statusCode: number; message: string }
): BulkOperationError => ({
  id,
  error: { code: bulkErrorCodeForStatus(err.statusCode), message: err.message },
});

/**
 * Builds a per-rule bulk error flagging that the rule's saved object was
 * persisted but the paired Task Manager call failed, leaving its task state
 * diverged. Surfaced alongside the affected count so clients can detect the
 * drift and (optionally) retry.
 */
const toTaskManagerDriftError = (id: string, message: string): BulkOperationError => ({
  id,
  error: { code: ALERTING_V2_ERROR_CODES.TASK_MANAGER_DRIFT, message },
});

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

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
  private readonly config: PluginConfig;

  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RulesSavedObjectServiceScopedToken)
    private readonly rulesSavedObjectService: RulesSavedObjectServiceContract,
    @inject(PluginStart<TaskManagerStartContract>('taskManager'))
    private readonly taskManager: TaskManagerStartContract,
    @inject(UserService) private readonly userService: UserServiceContract,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config'],
    @inject(RulesSavedObjectServiceInternalToken)
    private readonly rulesSavedObjectServiceInternal: RulesSavedObjectServiceContract,
    @inject(RuleEventPublisher) private readonly ruleEventPublisher: RuleEventPublisher,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {
    this.config = pluginConfigAccessor.get<PluginConfig>();
  }

  private getSpaceContext(): { spaceId: string } {
    return { spaceId: this.spaceId };
  }

  /**
   * The version counter incremented on every successful mutation. Persisted on
   * the rule SO (`version`) and used as `object.sequence` in the change history
   * index / `rule.version` on rule events. Always advances, independently of
   * whether change-history logging is enabled.
   */
  private getNextVersion(current?: number): number {
    return (current ?? 0) + 1;
  }

  /**
   * Validates a rule's schedule against the configured guardrails: the interval
   * may not be shorter than `minimumScheduleInterval`, and (when `checkLimit`)
   * scheduling it may not push the cluster past `maxScheduledPerMinute`. The
   * limit is only relevant when the rule contributes to the scheduled load
   * (i.e. it is, or is becoming, enabled).
   */
  private async validateSchedule({
    updatedEvery,
    prevEvery,
    checkLimit,
  }: {
    updatedEvery: string;
    prevEvery?: string;
    checkLimit: boolean;
  }): Promise<void> {
    this.assertScheduleIntervalAllowed(updatedEvery);
    if (checkLimit) {
      await this.assertScheduleLimitNotExceeded({ updatedEvery, prevEvery });
    }
  }

  /**
   * Rejects a rule whose `schedule.every` is shorter than the configured
   * `xpack.alerting_v2.rules.minimumScheduleInterval`.
   */
  private assertScheduleIntervalAllowed(every: string): void {
    const { minimumScheduleInterval } = this.config.rules;
    const everyMs = parseDurationToMs(every);
    const minimumMs = parseDurationToMs(minimumScheduleInterval);

    if (Number.isFinite(everyMs) && everyMs < minimumMs) {
      throw Boom.badRequest(
        `Rule schedule interval of "${every}" is shorter than the allowed minimum of "${minimumScheduleInterval}"`,
        {
          code: ALERTING_V2_ERROR_CODES.SCHEDULE_INTERVAL_TOO_SHORT,
          details: { interval: every, minimumScheduleInterval },
        }
      );
    }
  }

  /**
   * Rejects a rule whose schedule would push the total number of rule runs per
   * minute across all spaces past the configured
   * `xpack.alerting_v2.rules.maxScheduledPerMinute`. When editing an
   * already-scheduled rule, its previous schedule is added back before
   * comparing so an unchanged or relaxed schedule is never rejected.
   */
  private async assertScheduleLimitNotExceeded({
    updatedEvery,
    prevEvery,
  }: {
    updatedEvery: string;
    prevEvery?: string;
  }): Promise<void> {
    const { maxScheduledPerMinute } = this.config.rules;

    const updatedSchedulesPerMinute = convertEveryToSchedulesPerMinute(updatedEvery);
    const prevSchedulesPerMinute = prevEvery ? convertEveryToSchedulesPerMinute(prevEvery) : 0;

    // An unchanged or less-frequent schedule adds no scheduled load, so it can
    // never breach the limit. Skip the cluster-wide scan in that case (the
    // previous schedule is already counted in the total).
    if (updatedSchedulesPerMinute <= prevSchedulesPerMinute) {
      return;
    }

    const totalScheduledPerMinute =
      await this.rulesSavedObjectServiceInternal.getTotalScheduledPerMinute();

    const remainingSchedulesPerMinute =
      Math.max(maxScheduledPerMinute - totalScheduledPerMinute, 0) + prevSchedulesPerMinute;

    if (updatedSchedulesPerMinute > remainingSchedulesPerMinute) {
      throw Boom.badRequest(
        `Rule schedule of "${updatedEvery}" would exceed the limit of ${maxScheduledPerMinute} rule runs per minute`,
        {
          code: ALERTING_V2_ERROR_CODES.MAX_SCHEDULES_PER_MINUTE_EXCEEDED,
          details: { interval: updatedEvery, maxScheduledPerMinute },
        }
      );
    }
  }

  private parseRuleData<T>(
    schema: z.ZodType<T>,
    data: unknown,
    context: 'create' | 'update' | 'upsert'
  ): T {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw Boom.badRequest(getInvalidRuleDataMessage(context, stringifyZodError(parsed.error)), {
        code: ALERTING_V2_ERROR_CODES.INVALID_RULE_DATA,
        details: { context, errors: treeifyError(parsed.error) },
      });
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
        throw Boom.notFound(getRuleNotFoundMessage(id), {
          code: ALERTING_V2_ERROR_CODES.RULE_NOT_FOUND,
          details: { rule_id: id },
        });
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
  }): Promise<{ id: string; version?: string }> {
    try {
      return await this.rulesSavedObjectService.update({ id, attrs, version });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(getRuleVersionConflictMessage(id), {
          code: ALERTING_V2_ERROR_CODES.RULE_VERSION_CONFLICT,
          details: { rule_id: id },
        });
      }
      throw e;
    }
  }

  @withApm
  public async createRule(params: CreateRuleParams): Promise<RuleResponse> {
    const { spaceId } = this.getSpaceContext();
    const parsed = this.parseRuleData(createRuleDataSchema, params.data, 'create');

    const userProfileUid = await this.userService.getCurrentUserProfileUid();

    const nowIso = new Date().toISOString();
    const ruleVersion = this.getNextVersion();

    const ruleAttributes = transformCreateRuleBodyToRuleSoAttributes(parsed, {
      enabled: true,
      createdBy: userProfileUid,
      createdAt: nowIso,
      updatedBy: userProfileUid,
      updatedAt: nowIso,
      version: ruleVersion,
    });

    // A freshly created rule is always enabled, so it always counts towards the limit.
    await this.validateSchedule({ updatedEvery: ruleAttributes.schedule.every, checkLimit: true });

    let created: { id: string; version?: string };
    try {
      created = await this.rulesSavedObjectService.create({
        attrs: ruleAttributes,
        id: params.options?.id,
      });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        const conflictId = params.options?.id ?? 'unknown';
        throw Boom.conflict(getRuleAlreadyExistsMessage(conflictId), {
          code: ALERTING_V2_ERROR_CODES.RULE_ALREADY_EXISTS,
          details: { rule_id: conflictId },
        });
      }
      throw e;
    }

    const { id, version } = created;

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

    const rule = transformRuleSoAttributesToRuleApiResponse(id, ruleAttributes, version);
    this.ruleEventPublisher.emitRuleCreated(this.request, [
      { ruleId: rule.id, spaceId: this.spaceId, rule },
    ]);
    return rule;
  }

  @withApm
  public async updateRule({ id, data, options }: UpdateRuleParams): Promise<RuleResponse> {
    const { spaceId } = this.getSpaceContext();
    const parsed = this.parseRuleData(updateRuleDataSchema, data, 'update');

    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const nowIso = new Date().toISOString();

    const { attrs: existingAttrs, version: existingVersion } = await this.getExistingRule(id);

    if (
      !isStateTransitionAllowed({
        kind: existingAttrs.kind,
        state_transition: parsed.state_transition,
      })
    ) {
      throw Boom.badRequest('stateTransition is only allowed for rules of kind "alert".', {
        code: ALERTING_V2_ERROR_CODES.INVALID_STATE_TRANSITION,
        details: { rule_id: id, rule_kind: existingAttrs.kind },
      });
    }

    const ruleVersion = this.getNextVersion(existingAttrs.metadata.version);
    const nextAttrs = buildUpdateRuleAttributes(existingAttrs, parsed, {
      updatedBy: userProfileUid,
      updatedAt: nowIso,
      version: ruleVersion,
    });

    await this.validateSchedule({
      updatedEvery: nextAttrs.schedule.every,
      prevEvery: existingAttrs.schedule.every,
      checkLimit: existingAttrs.enabled,
    });

    // updateRule NEVER changes whether a rule runs — it only re-syncs the
    // schedule interval of an already-enabled rule (Task Manager's
    // `ensureScheduled` updates the interval of the existing task on conflict).
    // Turning the run loop on/off stays exclusively with enableRule/disableRule,
    // so a disabled rule is never resurrected by an unrelated property edit.
    if (existingAttrs.enabled) {
      await this.scheduleRuleExecutorTask({
        ruleId: id,
        spaceId,
        scheduleEvery: nextAttrs.schedule.every,
      });
    }

    const { version: newVersion } = await this.writeRuleAttrs({
      id,
      attrs: nextAttrs,
      version: options?.version ?? existingVersion,
    });

    const rule = transformRuleSoAttributesToRuleApiResponse(id, nextAttrs, newVersion);

    this.ruleEventPublisher.emitRuleUpdated(this.request, [
      { ruleId: rule.id, spaceId: this.spaceId, rule },
    ]);

    return rule;
  }

  @withApm
  public async getRule({ id }: { id: string }): Promise<RuleResponse> {
    const { attrs, version } = await this.getExistingRule(id);
    return transformRuleSoAttributesToRuleApiResponse(id, attrs, version);
  }

  @withApm
  public async getRules(ids: string[]): Promise<RuleResponse[]> {
    const result = await this.rulesSavedObjectService.bulkGetByIds(ids);

    const rulesById = new Map<string, RuleResponse>();

    for (const doc of result) {
      if ('error' in doc) {
        throw new Boom.Boom(doc.error.message, { statusCode: doc.error.statusCode });
      }
      rulesById.set(doc.id, transformRuleSoAttributesToRuleApiResponse(doc.id, doc.attributes));
    }

    return ids.map((id) => rulesById.get(id)!).filter(Boolean);
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

    // Assert the rule exists (surfaces an enriched RULE_NOT_FOUND 404) before
    // touching the task or emitting. The attributes are captured so the deleted
    // rule can be emitted as the change-history snapshot for the deletion.
    const { attrs: existingAttrs } = await this.getExistingRule(id);

    const taskId = getRuleExecutorTaskId({ ruleId: id, spaceId });
    await this.taskManager.removeIfExists(taskId);

    await this.rulesSavedObjectService.delete({ id });

    // Nothing is persisted on delete, so stamp the bumped counter onto the
    // emitted rule so the deletion orders after the last change.
    const rule = transformRuleSoAttributesToRuleApiResponse(id, {
      ...existingAttrs,
      metadata: {
        ...existingAttrs.metadata,
        version: this.getNextVersion(existingAttrs.metadata.version),
      },
    });
    this.ruleEventPublisher.emitRuleDeleted(this.request, [
      { ruleId: id, spaceId: this.spaceId, rule },
    ]);
  }

  @withApm
  public async runRuleNow({ id }: { id: string }): Promise<void> {
    const { spaceId } = this.getSpaceContext();

    const { attrs } = await this.getExistingRule(id);

    if (!attrs.enabled) {
      throw Boom.badRequest(`Rule with id "${id}" is disabled and cannot be run`, {
        code: ALERTING_V2_ERROR_CODES.RULE_DISABLED,
        details: { rule_id: id },
      });
    }

    const taskId = getRuleExecutorTaskId({ ruleId: id, spaceId });

    let conflict: boolean | undefined;
    try {
      ({ conflict } = await this.taskManager.runSoon(taskId));
    } catch (e) {
      if (e instanceof TaskAlreadyRunningError) {
        throw Boom.conflict(`Rule with id "${id}" is already running`, {
          code: ALERTING_V2_ERROR_CODES.RULE_ALREADY_RUNNING,
          details: { rule_id: id },
        });
      }

      // Avoid leaking task-store / saved-object errors (e.g. a 404 when the
      // rule is enabled but has no executor task). Prefer a code already on
      // the Boom payload when present; otherwise use the generic run error.
      const existingCode = Boom.isBoom(e)
        ? (e.data as { code?: string } | undefined)?.code
        : undefined;

      throw Boom.internal(`Failed to run rule with id "${id}"`, {
        code: existingCode ?? ALERTING_V2_ERROR_CODES.RULE_RUN_ERROR,
        details: { rule_id: id },
      });
    }

    if (conflict) {
      // The task store update raced with another concurrent update and was
      // rejected with a 409 — the task was not actually rescheduled. Surface
      // as a soft conflict so the caller can retry.
      throw Boom.conflict(`Running rule with id "${id}" conflicted, please retry`, {
        code: ALERTING_V2_ERROR_CODES.RULE_RUN_CONFLICT,
        details: { rule_id: id },
      });
    }
  }

  @withApm
  public async enableRule({ id }: { id: string }): Promise<RuleResponse> {
    const { spaceId } = this.getSpaceContext();

    const { attrs: existingAttrs, version: existingVersion } = await this.getExistingRule(id);

    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const nowIso = new Date().toISOString();

    const ruleVersion = this.getNextVersion(existingAttrs.metadata.version);
    const nextAttrs: RuleSavedObjectAttributes = {
      ...existingAttrs,
      enabled: true,
      updatedBy: userProfileUid,
      updatedAt: nowIso,
      metadata: { ...existingAttrs.metadata, version: ruleVersion },
    };

    // Re-enabling an already-enabled rule is intentionally not short-circuited:
    // it re-writes the SO and re-ensures the executor task (self-heal), and still
    // emits `ruleEnabled`.
    if (!existingAttrs.enabled) {
      await this.validateSchedule({ updatedEvery: nextAttrs.schedule.every, checkLimit: true });
    }

    await this.scheduleRuleExecutorTask({
      ruleId: id,
      spaceId,
      scheduleEvery: nextAttrs.schedule.every,
    });

    const { version: newVersion } = await this.writeRuleAttrs({
      id,
      attrs: nextAttrs,
      version: existingVersion,
    });

    const rule = transformRuleSoAttributesToRuleApiResponse(id, nextAttrs, newVersion);
    this.ruleEventPublisher.emitRuleEnabled(this.request, [
      { ruleId: rule.id, spaceId: this.spaceId, rule },
    ]);
    return rule;
  }

  @withApm
  public async disableRule({ id }: { id: string }): Promise<RuleResponse> {
    const { spaceId } = this.getSpaceContext();

    const { attrs: existingAttrs, version: existingVersion } = await this.getExistingRule(id);

    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const nowIso = new Date().toISOString();

    // Disabling an already-disabled rule is intentionally not short-circuited: it
    // re-writes the SO and removes the executor task (self-heal), and still emits
    // `ruleDisabled`.
    const ruleVersion = this.getNextVersion(existingAttrs.metadata.version);
    const nextAttrs: RuleSavedObjectAttributes = {
      ...existingAttrs,
      enabled: false,
      updatedBy: userProfileUid,
      updatedAt: nowIso,
      metadata: { ...existingAttrs.metadata, version: ruleVersion },
    };

    const taskId = getRuleExecutorTaskId({ ruleId: id, spaceId });
    await this.taskManager.removeIfExists(taskId);

    const { version: newVersion } = await this.writeRuleAttrs({
      id,
      attrs: nextAttrs,
      version: existingVersion,
    });

    const rule = transformRuleSoAttributesToRuleApiResponse(id, nextAttrs, newVersion);
    this.ruleEventPublisher.emitRuleDisabled(this.request, [
      { ruleId: rule.id, spaceId: this.spaceId, rule },
    ]);
    return rule;
  }

  @withApm
  public async getTags(params: { filter?: string } = {}): Promise<string[]> {
    const soFilter = params.filter ? buildRuleSoFilter(params.filter) : undefined;
    return this.rulesSavedObjectService.findTags({ filter: soFilter });
  }

  @withApm
  public async findRules(params: FindRulesArgs = {}): Promise<FindRulesResponse> {
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
        transformRuleSoAttributesToRuleApiResponse(so.id, so.attributes, so.version)
      ),
      total: res.total,
      page,
      perPage,
    };
  }

  /**
   * Translates a by-query bulk request into the shape the saved-object service
   * expects (SO filter + `search` + `searchFields`). Kept as its own helper so
   * the two consumers below — {@link countByQuery} and {@link getRuleIdsByQuery}
   * — always agree on the query they're issuing against the same index.
   */
  private buildSoQueryParams(params: Pick<BulkByQueryParams, 'filter' | 'search'>): {
    filter?: string;
    search?: string;
    searchFields?: string[];
  } {
    const soFilter = params.filter ? buildRuleSoFilter(params.filter) : undefined;
    const search = buildSoSearch(params.search);
    return {
      filter: soFilter,
      search,
      searchFields: search ? RULE_SEARCH_FIELDS : undefined,
    };
  }

  /**
   * Removes the executor tasks for the given rules and records Task Manager
   * drift for any that could not be removed: it logs at `error` level under the
   * `TASK_MANAGER_DRIFT` code and, when an `errors` sink is provided, appends a
   * per-rule `TASK_MANAGER_DRIFT` entry so the drift surfaces in the bulk
   * response.
   */
  private async removeExecutorTasks({
    ruleIds,
    spaceId,
    errors,
  }: {
    ruleIds: string[];
    spaceId: string;
    errors?: BulkOperationError[];
  }): Promise<void> {
    if (ruleIds.length === 0) {
      return;
    }

    const ruleIdByTaskId = new Map(
      ruleIds.map((ruleId) => [getRuleExecutorTaskId({ ruleId, spaceId }), ruleId] as const)
    );

    let driftedRuleIds = ruleIds;
    let cause: unknown;
    try {
      const { statuses } = await this.taskManager.bulkRemove([...ruleIdByTaskId.keys()]);
      // A missing task (404) is the desired end state and is ignored.
      // Any other failed status means the task lingers and is reported as drift.
      driftedRuleIds = statuses.flatMap((status) => {
        if (status.success || status.error?.statusCode === 404) {
          return [];
        }
        const ruleId = ruleIdByTaskId.get(status.id);
        return ruleId ? [ruleId] : [];
      });
    } catch (e) {
      cause = e;
    }

    if (driftedRuleIds.length === 0) {
      return;
    }

    const message = `Failed to remove executor task(s) for rule(s) [${driftedRuleIds.join(
      ', '
    )}]; their tasks may still exist but the executor defense halts them${
      cause ? `: ${errorMessage(cause)}` : ''
    }`;

    this.logger.error({
      error: new Error(message),
      code: ALERTING_V2_ERROR_CODES.TASK_MANAGER_DRIFT,
    });

    errors?.push(...driftedRuleIds.map((id) => toTaskManagerDriftError(id, message)));
  }

  /**
   * Executes a bulk delete against a known list of ids. Task-manager task
   * removal is best-effort; only saved-object errors surface as per-rule
   * bulk errors. Task-removal failures do not fail the operation but are
   * logged and surfaced per-rule as `TASK_MANAGER_DRIFT` errors.
   */
  private async executeBulkDelete(ids: string[]): Promise<BulkResponse> {
    const { spaceId } = this.getSpaceContext();
    const errors: BulkOperationError[] = [];
    let affectedCount = 0;

    if (ids.length === 0) {
      return { affected_count: 0, errors: [] };
    }

    // Capture pre-delete state so the deleted rule can be emitted as the
    // change-history snapshot per deleted rule.
    const attrsById = new Map<string, RuleSavedObjectAttributes>();
    for (const doc of await this.rulesSavedObjectService.bulkGetByIds(ids)) {
      if (!('error' in doc)) {
        attrsById.set(doc.id, doc.attributes);
      }
    }

    const deleteResults = await this.rulesSavedObjectService.bulkDelete(ids);
    const deletedRules: EventRule[] = [];
    for (const result of deleteResults) {
      if (!result.success) {
        errors.push(toBulkError(result.id, result.error));
        continue;
      }

      affectedCount += 1;
      const attrs = attrsById.get(result.id);
      deletedRules.push(
        attrs
          ? {
              ruleId: result.id,
              spaceId,
              rule: transformRuleSoAttributesToRuleApiResponse(result.id, {
                ...attrs,
                metadata: {
                  ...attrs.metadata,
                  version: this.getNextVersion(attrs.metadata.version),
                },
              }),
            }
          : { ruleId: result.id, spaceId }
      );
    }

    await this.removeExecutorTasks({
      ruleIds: deletedRules.map((rule) => rule.ruleId),
      spaceId,
      errors,
    });

    this.ruleEventPublisher.emitRuleDeleted(this.request, deletedRules);

    return { affected_count: affectedCount, errors };
  }

  private async executeBulkEnable(ids: string[]): Promise<BulkResponse> {
    const { spaceId } = this.getSpaceContext();
    const errors: BulkOperationError[] = [];
    let affectedCount = 0;

    if (ids.length === 0) {
      return { affected_count: 0, errors: [] };
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
        errors.push(toBulkError(doc.id, doc.error));
        continue;
      }

      if (doc.attributes.enabled) {
        affectedCount += 1;
        continue;
      }

      const ruleVersion = this.getNextVersion(doc.attributes.metadata.version);
      const nextAttrs: RuleSavedObjectAttributes = {
        ...doc.attributes,
        enabled: true,
        updatedBy: userProfileUid,
        updatedAt: nowIso,
        metadata: { ...doc.attributes.metadata, version: ruleVersion },
      };

      itemsToUpdate.push({ id: doc.id, attrs: nextAttrs, version: doc.version });
    }

    if (itemsToUpdate.length > 0) {
      const tasksToSchedule: Array<{
        id: string;
        taskType: string;
        schedule: { interval: string };
        params: RuleExecutorTaskParams;
        state: Record<string, unknown>;
        scope: string[];
        enabled: boolean;
      }> = itemsToUpdate.map((item) => ({
        id: getRuleExecutorTaskId({ ruleId: item.id, spaceId }),
        taskType: ALERTING_RULE_EXECUTOR_TASK_TYPE,
        schedule: { interval: item.attrs.schedule.every },
        params: { ruleId: item.id, spaceId },
        state: {},
        scope: ['alerting'],
        enabled: true,
      }));

      try {
        await this.taskManager.bulkSchedule(tasksToSchedule, {
          request: this.request as unknown as CoreKibanaRequest,
          cloneApiKey: true,
        });
      } catch (e) {
        const driftedRuleIds = itemsToUpdate.map((item) => item.id);
        const message = `Failed to schedule executor task(s) for rule(s) [${driftedRuleIds.join(
          ', '
        )}]; they remain disabled: ${errorMessage(e)}`;

        this.logger.error({
          error: new Error(message),
          code: ALERTING_V2_ERROR_CODES.TASK_MANAGER_DRIFT,
        });

        for (const id of driftedRuleIds) {
          errors.push(toTaskManagerDriftError(id, message));
        }

        // bulkSchedule may have created some tasks before throwing on a later
        // per-item failure; roll them back best-effort before returning.
        await this.removeExecutorTasks({
          ruleIds: driftedRuleIds,
          spaceId,
        });

        return { affected_count: affectedCount, errors };
      }

      const updateResults = await this.rulesSavedObjectService.bulkUpdate(itemsToUpdate);

      const enabledRules: EventRule[] = [];
      const failedUpdateRuleIds: string[] = [];

      for (let i = 0; i < updateResults.length; i++) {
        const updateResult = updateResults[i];
        const item = itemsToUpdate[i];

        if (!updateResult.success) {
          errors.push(toBulkError(updateResult.id, updateResult.error));
          failedUpdateRuleIds.push(item.id);
          continue;
        }

        affectedCount += 1;
        const rule = transformRuleSoAttributesToRuleApiResponse(item.id, item.attrs);
        enabledRules.push({ ruleId: rule.id, spaceId, rule });
      }

      await this.removeExecutorTasks({
        ruleIds: failedUpdateRuleIds,
        spaceId,
      });

      this.ruleEventPublisher.emitRuleEnabled(this.request, enabledRules);
    }

    return { affected_count: affectedCount, errors };
  }

  private async executeBulkDisable(ids: string[]): Promise<BulkResponse> {
    const { spaceId } = this.getSpaceContext();
    const errors: BulkOperationError[] = [];
    let affectedCount = 0;

    if (ids.length === 0) {
      return { affected_count: 0, errors: [] };
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
        errors.push(toBulkError(doc.id, doc.error));
        continue;
      }

      if (!doc.attributes.enabled) {
        affectedCount += 1;
        continue;
      }

      const ruleVersion = this.getNextVersion(doc.attributes.metadata.version);
      const nextAttrs: RuleSavedObjectAttributes = {
        ...doc.attributes,
        enabled: false,
        updatedBy: userProfileUid,
        updatedAt: nowIso,
        metadata: { ...doc.attributes.metadata, version: ruleVersion },
      };

      itemsToUpdate.push({ id: doc.id, attrs: nextAttrs, version: doc.version });
    }

    const disabledRules: EventRule[] = [];

    if (itemsToUpdate.length > 0) {
      const updateResults = await this.rulesSavedObjectService.bulkUpdate(itemsToUpdate);

      for (let i = 0; i < updateResults.length; i++) {
        const updateResult = updateResults[i];
        const item = itemsToUpdate[i];

        if (!updateResult.success) {
          errors.push(toBulkError(updateResult.id, updateResult.error));
          continue;
        }

        const rule = transformRuleSoAttributesToRuleApiResponse(item.id, item.attrs);
        affectedCount += 1;
        disabledRules.push({ ruleId: rule.id, spaceId, rule });
      }
    }

    await this.removeExecutorTasks({
      ruleIds: disabledRules.map((rule) => rule.ruleId),
      spaceId,
      errors,
    });

    this.ruleEventPublisher.emitRuleDisabled(this.request, disabledRules);

    return { affected_count: affectedCount, errors };
  }

  /**
   * By-query dispatcher shared by delete / enable / disable. Always issues a
   * cheap `countByQuery` first (a `perPage: 0` aggregation, no doc streaming)
   * and only opens the PIT-based id stream when it's actually needed:
   *
   *  - dry-run: skip the stream entirely if nothing matches; otherwise stream
   *    up to {@link BULK_QUERY_SAMPLE_SIZE} ids for the preview.
   *  - force: if the count exceeds {@link BULK_FILTER_MAX_RESOURCES}, reject
   *    before touching a single rule (atomicity-like guarantee — all-or-nothing);
   *    if it's zero, skip the stream and hand the executor an empty list; only
   *    otherwise pay for the PIT scan.
   *
   * Splitting count and stream avoids burning a full ~10k-doc PIT scan on
   * requests we already know we're going to reject.
   */
  private async runByQuery(
    params: BulkByQueryParams,
    executor: (ids: string[]) => Promise<BulkResponse>
  ): Promise<BulkByQueryResult> {
    const force = params.force === true;
    const soParams = this.buildSoQueryParams(params);

    const total = await this.rulesSavedObjectService.countByQuery(soParams);

    if (!force) {
      if (total === 0) {
        return { match_count: 0, sample: [] };
      }

      const sample = await this.rulesSavedObjectService.getRuleIdsByQuery({
        ...soParams,
        maxItems: BULK_QUERY_SAMPLE_SIZE,
      });

      return { match_count: total, sample };
    }

    if (total > BULK_FILTER_MAX_RESOURCES) {
      throw Boom.badRequest(
        `Filter matches ${total} rules, exceeding the maximum of ${BULK_FILTER_MAX_RESOURCES} per request. Narrow the filter or split the operation into multiple requests.`,
        {
          code: ALERTING_V2_ERROR_CODES.BULK_QUERY_MATCH_LIMIT_EXCEEDED,
          details: { match_count: total, limit: BULK_FILTER_MAX_RESOURCES },
        }
      );
    }

    if (total === 0) {
      return executor([]);
    }

    const ids = await this.rulesSavedObjectService.getRuleIdsByQuery({
      ...soParams,
      maxItems: BULK_FILTER_MAX_RESOURCES,
    });

    return executor(ids);
  }

  @withApm
  public async bulkDeleteRules(params: BulkByIdsParams): Promise<BulkResponse> {
    return this.executeBulkDelete(params.ids);
  }

  @withApm
  public async bulkEnableRules(params: BulkByIdsParams): Promise<BulkResponse> {
    return this.executeBulkEnable(params.ids);
  }

  @withApm
  public async bulkDisableRules(params: BulkByIdsParams): Promise<BulkResponse> {
    return this.executeBulkDisable(params.ids);
  }

  @withApm
  public async deleteRulesByQuery(params: BulkByQueryParams): Promise<BulkByQueryResult> {
    return this.runByQuery(params, (ids) => this.executeBulkDelete(ids));
  }

  @withApm
  public async enableRulesByQuery(params: BulkByQueryParams): Promise<BulkByQueryResult> {
    return this.runByQuery(params, (ids) => this.executeBulkEnable(ids));
  }

  @withApm
  public async disableRulesByQuery(params: BulkByQueryParams): Promise<BulkByQueryResult> {
    return this.runByQuery(params, (ids) => this.executeBulkDisable(ids));
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
    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const nowIso = new Date().toISOString();

    const { attrs: existingAttrs, version: existingVersion } = await this.getExistingRule(id);

    assertImmutableUnchanged(parsed, existingAttrs);

    const ruleVersion = this.getNextVersion(existingAttrs.metadata.version);
    const nextAttrs = transformCreateRuleBodyToRuleSoAttributes(parsed, {
      enabled: existingAttrs.enabled,
      createdBy: existingAttrs.createdBy,
      createdAt: existingAttrs.createdAt,
      updatedBy: userProfileUid,
      updatedAt: nowIso,
      version: ruleVersion,
    });

    await this.validateSchedule({
      updatedEvery: nextAttrs.schedule.every,
      prevEvery: existingAttrs.schedule.every,
      checkLimit: existingAttrs.enabled,
    });

    await this.scheduleRuleExecutorTask({
      ruleId: id,
      spaceId,
      scheduleEvery: nextAttrs.schedule.every,
    });

    const { version: newVersion } = await this.writeRuleAttrs({
      id,
      attrs: nextAttrs,
      version: existingVersion,
    });

    const rule = transformRuleSoAttributesToRuleApiResponse(id, nextAttrs, newVersion);
    this.ruleEventPublisher.emitRuleUpdated(this.request, [
      { ruleId: rule.id, spaceId: this.spaceId, rule },
    ]);
    return { rule, created: false };
  }
}
