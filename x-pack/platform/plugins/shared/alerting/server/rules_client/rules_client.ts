/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnmuteAlertParams } from '../application/rule/methods/unmute_alert/types';
import { getRuleTags, RuleTagsParams } from '../application/rule/methods/tags';
import { MuteAlertParams } from '../application/rule/methods/mute_alert/types';
import { SanitizedRule, RuleTypeParams } from '../types';
import { parseDuration } from '../../common/parse_duration';
import { RulesClientContext } from './types';
import { cloneRule, CloneRuleParams } from '../application/rule/methods/clone';
import { createRule, CreateRuleParams } from '../application/rule/methods/create';
import { updateRule, UpdateRuleParams } from '../application/rule/methods/update';
import { snoozeRule, SnoozeRuleOptions } from '../application/rule/methods/snooze';
import { unsnoozeRule, UnsnoozeParams } from '../application/rule/methods/unsnooze';
import { getRule, GetRuleParams } from '../application/rule/methods/get';
import { resolveRule, ResolveParams } from '../application/rule/methods/resolve';
import { getAlertState, GetAlertStateParams } from './methods/get_alert_state';
import { getAlertSummary, GetAlertSummaryParams } from './methods/get_alert_summary';
import {
  GetExecutionLogByIdParams,
  getExecutionLogForRule,
  GetGlobalExecutionLogParams,
  getGlobalExecutionLogWithAuth,
} from './methods/get_execution_log';
import {
  getActionErrorLog,
  GetActionErrorLogByIdParams,
  getActionErrorLogWithAuth,
} from './methods/get_action_error_log';
import {
  GetGlobalExecutionKPIParams,
  getGlobalExecutionKpiWithAuth,
  getRuleExecutionKPI,
  GetRuleExecutionKPIParams,
} from './methods/get_execution_kpi';
import { findRules, FindRulesParams } from '../application/rule/methods/find';
import { AggregateParams } from '../application/rule/methods/aggregate/types';
import { aggregateRules } from '../application/rule/methods/aggregate';
import { deleteRule, DeleteRuleParams } from '../application/rule/methods/delete';
import {
  bulkDeleteRules,
  BulkDeleteRulesRequestBody,
} from '../application/rule/methods/bulk_delete';
import {
  bulkDisableRules,
  BulkDisableRulesRequestBody,
} from '../application/rule/methods/bulk_disable';
import {
  bulkEditRules,
  BulkEditOptions,
} from '../application/rule/methods/bulk_edit/bulk_edit_rules';
import { bulkEnableRules, BulkEnableRulesParams } from '../application/rule/methods/bulk_enable';
import { enableRule } from '../application/rule/methods/enable_rule/enable_rule';
import { updateRuleApiKey } from '../application/rule/methods/update_api_key/update_rule_api_key';
import { disableRule } from '../application/rule/methods/disable/disable_rule';
import { muteInstance } from '../application/rule/methods/mute_alert/mute_instance';
import { unmuteAll } from '../application/rule/methods/unmute_all';
import { muteAll } from '../application/rule/methods/mute_all';
import { unmuteInstance } from '../application/rule/methods/unmute_alert/unmute_instance';
import { runSoon } from './methods/run_soon';
import { listRuleTypes } from '../application/rule/methods/rule_types/rule_types';
import { getScheduleFrequency } from '../application/rule/methods/get_schedule_frequency/get_schedule_frequency';
import {
  bulkUntrackAlerts,
  BulkUntrackBody,
} from '../application/rule/methods/bulk_untrack/bulk_untrack_alerts';
import { ScheduleBackfillParams } from '../application/backfill/methods/schedule/types';
import { scheduleBackfill } from '../application/backfill/methods/schedule';
import { getBackfill } from '../application/backfill/methods/get';
import { findBackfill } from '../application/backfill/methods/find';
import { deleteBackfill } from '../application/backfill/methods/delete';
import { FindBackfillParams } from '../application/backfill/methods/find/types';
import { DisableRuleParams } from '../application/rule/methods/disable';
import { EnableRuleParams } from '../application/rule/methods/enable_rule';
import { findGaps } from '../application/rule/methods/find_gaps';
import { fillGapById } from '../application/rule/methods/fill_gap_by_id';
import { FillGapByIdParams } from '../application/rule/methods/fill_gap_by_id/types';
import { GetRuleIdsWithGapsParams } from '../application/rule/methods/get_rule_ids_with_gaps/types';

import { getRuleIdsWithGaps } from '../application/rule/methods/get_rule_ids_with_gaps';
import { getGapsSummaryByRuleIds } from '../application/rule/methods/get_gaps_summary_by_rule_ids';
import { GetGapsSummaryByRuleIdsParams } from '../application/rule/methods/get_gaps_summary_by_rule_ids/types';
import { FindGapsParams } from '../lib/rule_gaps/types';

export type ConstructorOptions = Omit<
  RulesClientContext,
  'fieldsToExcludeFromPublicApi' | 'minimumScheduleIntervalInMs'
>;

export const fieldsToExcludeFromPublicApi: Array<keyof SanitizedRule> = [
  'monitoring',
  'mapped_params',
  'snoozeSchedule',
  'activeSnoozes',
];

export const fieldsToExcludeFromRevisionUpdates: ReadonlySet<keyof RuleTypeParams> = new Set([
  'activeSnoozes',
  'alertTypeId',
  'apiKey',
  'apiKeyOwner',
  'apiKeyCreatedByUser',
  'consumer',
  'createdAt',
  'createdBy',
  'enabled',
  'executionStatus',
  'id',
  'isSnoozedUntil',
  'lastRun',
  'monitoring',
  'muteAll',
  'mutedInstanceIds',
  'nextRun',
  'revision',
  'running',
  'snoozeSchedule',
  'systemActions',
  'updatedBy',
  'updatedAt',
]);

export class RulesClient {
  private readonly context: RulesClientContext;

  constructor(context: ConstructorOptions) {
    this.context = {
      ...context,
      minimumScheduleIntervalInMs: parseDuration(context.minimumScheduleInterval.value),
      fieldsToExcludeFromPublicApi,
    };
  }

  public aggregate = <T = Record<string, unknown>>(params: AggregateParams<T>): Promise<T> =>
    aggregateRules<T>(this.context, params);
  public clone = <Params extends RuleTypeParams = never>(params: CloneRuleParams) =>
    cloneRule<Params>(this.context, params);
  public create = <Params extends RuleTypeParams = never>(params: CreateRuleParams<Params>) =>
    createRule<Params>(this.context, params);
  public delete = (params: DeleteRuleParams) => deleteRule(this.context, params);
  public find = <Params extends RuleTypeParams = never>(params?: FindRulesParams) =>
    findRules<Params>(this.context, params);
  public get = <Params extends RuleTypeParams = never>(params: GetRuleParams) =>
    getRule<Params>(this.context, params);
  public resolve = <Params extends RuleTypeParams = never>(params: ResolveParams) =>
    resolveRule<Params>(this.context, params);
  public update = <Params extends RuleTypeParams = never>(params: UpdateRuleParams<Params>) =>
    updateRule<Params>(this.context, params);

  public getAlertState = (params: GetAlertStateParams) => getAlertState(this.context, params);
  public getAlertSummary = (params: GetAlertSummaryParams) => getAlertSummary(this.context, params);
  public getExecutionLogForRule = (params: GetExecutionLogByIdParams) =>
    getExecutionLogForRule(this.context, params);
  public getGlobalExecutionLogWithAuth = (params: GetGlobalExecutionLogParams) =>
    getGlobalExecutionLogWithAuth(this.context, params);
  public getRuleExecutionKPI = (params: GetRuleExecutionKPIParams) =>
    getRuleExecutionKPI(this.context, params);
  public getGlobalExecutionKpiWithAuth = (params: GetGlobalExecutionKPIParams) =>
    getGlobalExecutionKpiWithAuth(this.context, params);
  public getActionErrorLog = (params: GetActionErrorLogByIdParams) =>
    getActionErrorLog(this.context, params);
  public getActionErrorLogWithAuth = (params: GetActionErrorLogByIdParams) =>
    getActionErrorLogWithAuth(this.context, params);

  public bulkDeleteRules = (options: BulkDeleteRulesRequestBody) =>
    bulkDeleteRules(this.context, options);
  public bulkEdit = <Params extends RuleTypeParams>(options: BulkEditOptions<Params>) =>
    bulkEditRules<Params>(this.context, options);
  public bulkEnableRules = (params: BulkEnableRulesParams) => bulkEnableRules(this.context, params);
  public bulkDisableRules = (options: BulkDisableRulesRequestBody) =>
    bulkDisableRules(this.context, options);

  public updateRuleApiKey = (params: { id: string }) => updateRuleApiKey(this.context, params);
  public disableRule = (params: DisableRuleParams) => disableRule(this.context, params);
  public enableRule = (params: EnableRuleParams) => enableRule(this.context, params);

  public snooze = (options: SnoozeRuleOptions) => snoozeRule(this.context, options);
  public unsnooze = (options: UnsnoozeParams) => unsnoozeRule(this.context, options);

  public muteAll = (options: { id: string }) => muteAll(this.context, options);
  public unmuteAll = (options: { id: string }) => unmuteAll(this.context, options);
  public muteInstance = (options: MuteAlertParams) => muteInstance(this.context, options);
  public unmuteInstance = (options: UnmuteAlertParams) => unmuteInstance(this.context, options);

  public bulkUntrackAlerts = (options: BulkUntrackBody) => bulkUntrackAlerts(this.context, options);

  public runSoon = (options: { id: string }) => runSoon(this.context, options);

  public listRuleTypes = () => listRuleTypes(this.context);

  public scheduleBackfill = (params: ScheduleBackfillParams) =>
    scheduleBackfill(this.context, params);

  public getBackfill = (id: string) => getBackfill(this.context, id);

  public findBackfill = (params: FindBackfillParams) => findBackfill(this.context, params);

  public deleteBackfill = (id: string) => deleteBackfill(this.context, id);

  public getSpaceId(): string | undefined {
    return this.context.spaceId;
  }

  public getAuthorization() {
    return this.context.authorization;
  }

  public getAuditLogger() {
    return this.context.auditLogger;
  }

  public getTags = (params: RuleTagsParams) => getRuleTags(this.context, params);

  public getScheduleFrequency = () => getScheduleFrequency(this.context);

  public findGaps = (params: FindGapsParams) => findGaps(this.context, params);

  public fillGapById = (params: FillGapByIdParams) => fillGapById(this.context, params);

  public getRuleIdsWithGaps = (params: GetRuleIdsWithGapsParams) =>
    getRuleIdsWithGaps(this.context, params);

  public getGapsSummaryByRuleIds = (params: GetGapsSummaryByRuleIdsParams) =>
    getGapsSummaryByRuleIds(this.context, params);
}
