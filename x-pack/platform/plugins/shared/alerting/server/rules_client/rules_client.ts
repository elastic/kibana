/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EsqlQuery, Builder } from '@kbn/esql-ast';
import type { UnmuteAlertParams } from '../application/rule/methods/unmute_alert/types';
import type { RuleTagsParams } from '../application/rule/methods/tags';
import { getRuleTags } from '../application/rule/methods/tags';
import type { MuteAlertParams } from '../application/rule/methods/mute_alert/types';
import type { SanitizedRule, RuleTypeParams } from '../types';
import { parseDuration } from '../../common/parse_duration';
import type { RulesClientContext } from './types';
import type { CloneRuleParams } from '../application/rule/methods/clone';
import { cloneRule } from '../application/rule/methods/clone';
import type { CreateRuleParams, CreateRuleData } from '../application/rule/methods/create';
import { createRule } from '../application/rule/methods/create';
import type { UpdateRuleParams } from '../application/rule/methods/update';
import { updateRule } from '../application/rule/methods/update';
import type { SnoozeRuleOptions } from '../application/rule/methods/snooze';
import { snoozeRule } from '../application/rule/methods/snooze';
import type { UnsnoozeParams } from '../application/rule/methods/unsnooze';
import { unsnoozeRule } from '../application/rule/methods/unsnooze';
import type { GetRuleParams } from '../application/rule/methods/get';
import type { BulkGetRulesParams } from '../application/rule/methods/bulk_get';
import { getRule } from '../application/rule/methods/get';
import { bulkGetRules } from '../application/rule/methods/bulk_get';
import type { ResolveParams } from '../application/rule/methods/resolve';
import { resolveRule } from '../application/rule/methods/resolve';
import type { GetAlertStateParams } from './methods/get_alert_state';
import { getAlertState } from './methods/get_alert_state';
import type { GetAlertSummaryParams } from './methods/get_alert_summary';
import { getAlertSummary } from './methods/get_alert_summary';
import type {
  GetExecutionLogByIdParams,
  GetGlobalExecutionLogParams,
} from './methods/get_execution_log';
import { getExecutionLogForRule, getGlobalExecutionLogWithAuth } from './methods/get_execution_log';
import type { GetActionErrorLogByIdParams } from './methods/get_action_error_log';
import { getActionErrorLog, getActionErrorLogWithAuth } from './methods/get_action_error_log';
import type {
  GetGlobalExecutionKPIParams,
  GetRuleExecutionKPIParams,
} from './methods/get_execution_kpi';
import { getGlobalExecutionKpiWithAuth, getRuleExecutionKPI } from './methods/get_execution_kpi';
import type { FindRulesParams } from '../application/rule/methods/find';
import { findRules } from '../application/rule/methods/find';
import type { AggregateParams } from '../application/rule/methods/aggregate/types';
import { aggregateRules } from '../application/rule/methods/aggregate';
import type { DeleteRuleParams } from '../application/rule/methods/delete';
import { deleteRule } from '../application/rule/methods/delete';
import type { BulkDeleteRulesRequestBody } from '../application/rule/methods/bulk_delete';
import { bulkDeleteRules } from '../application/rule/methods/bulk_delete';
import type { BulkDisableRulesRequestBody } from '../application/rule/methods/bulk_disable';
import { bulkDisableRules } from '../application/rule/methods/bulk_disable';
import type { BulkEditOptions } from '../application/rule/methods/bulk_edit/bulk_edit_rules';
import { bulkEditRules } from '../application/rule/methods/bulk_edit/bulk_edit_rules';
import type { BulkEditRuleParamsOptions } from '../application/rule/methods/bulk_edit_params/types';
import { bulkEditRuleParamsWithReadAuth } from '../application/rule/methods/bulk_edit_params/bulk_edit_rule_params';
import type { BulkEnableRulesParams } from '../application/rule/methods/bulk_enable';
import { bulkEnableRules } from '../application/rule/methods/bulk_enable';
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
import type { BulkUntrackBody } from '../application/rule/methods/bulk_untrack/bulk_untrack_alerts';
import { bulkUntrackAlerts } from '../application/rule/methods/bulk_untrack/bulk_untrack_alerts';
import type { ScheduleBackfillParams } from '../application/backfill/methods/schedule/types';
import { scheduleBackfill } from '../application/backfill/methods/schedule';
import { getBackfill } from '../application/backfill/methods/get';
import { findBackfill } from '../application/backfill/methods/find';
import { deleteBackfill } from '../application/backfill/methods/delete';
import type { FindBackfillParams } from '../application/backfill/methods/find/types';
import type { DisableRuleParams } from '../application/rule/methods/disable';
import type { EnableRuleParams } from '../application/rule/methods/enable_rule';
import { findGaps } from '../application/rule/methods/find_gaps';
import { fillGapById } from '../application/rule/methods/fill_gap_by_id';
import type { FillGapByIdParams } from '../application/rule/methods/fill_gap_by_id/types';
import type { GetRuleIdsWithGapsParams } from '../application/rule/methods/get_rule_ids_with_gaps/types';

import { getRuleIdsWithGaps } from '../application/rule/methods/get_rule_ids_with_gaps';
import { getGapsSummaryByRuleIds } from '../application/rule/methods/get_gaps_summary_by_rule_ids';
import type { GetGapsSummaryByRuleIdsParams } from '../application/rule/methods/get_gaps_summary_by_rule_ids/types';
import type { FindGapsParams } from '../lib/rule_gaps/types';
import type { GetGlobalExecutionSummaryParams } from './methods/get_execution_summary';
import { getGlobalExecutionSummaryWithAuth } from './methods/get_execution_summary';
import { bulkFillGapsByRuleIds } from '../application/rule/methods/bulk_fill_gaps_by_rule_ids';
import type {
  BulkFillGapsByRuleIdsOptions,
  BulkFillGapsByRuleIdsParams,
} from '../application/rule/methods/bulk_fill_gaps_by_rule_ids/types';
import type { GetRuleTypesByQueryParams } from '../application/rule/methods/get_rule_types_by_query/types';
import { getRuleTypesByQuery } from '../application/rule/methods/get_rule_types_by_query/get_rule_types_by_query';
import type { GetRuleTemplateParams } from '../application/rule_template/methods/get/types';
import { getRuleTemplate } from '../application/rule_template/methods/get/get_rule_template';
import type { RuleParamsV1 } from '../../common/routes/rule/response';

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
  public getGlobalExecutionSummaryWithAuth = (params: GetGlobalExecutionSummaryParams) =>
    getGlobalExecutionSummaryWithAuth(this.context, params);
  public getActionErrorLog = (params: GetActionErrorLogByIdParams) =>
    getActionErrorLog(this.context, params);
  public getActionErrorLogWithAuth = (params: GetActionErrorLogByIdParams) =>
    getActionErrorLogWithAuth(this.context, params);

  public bulkGetRules = <Params extends RuleTypeParams = never>(params: BulkGetRulesParams) =>
    bulkGetRules<Params>(this.context, params);
  public bulkDeleteRules = (options: BulkDeleteRulesRequestBody) =>
    bulkDeleteRules(this.context, options);
  public bulkEdit = <Params extends RuleTypeParams>(options: BulkEditOptions<Params>) =>
    bulkEditRules<Params>(this.context, options);
  public bulkEditRuleParamsWithReadAuth = <Params extends RuleTypeParams>(
    options: BulkEditRuleParamsOptions<Params>
  ) => bulkEditRuleParamsWithReadAuth<Params>(this.context, options);
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

  public getTemplate = (params: GetRuleTemplateParams) => getRuleTemplate(this.context, params);

  public getScheduleFrequency = () => getScheduleFrequency(this.context);

  public findGaps = (params: FindGapsParams) => findGaps(this.context, params);

  public fillGapById = (params: FillGapByIdParams) => fillGapById(this.context, params);

  public bulkFillGapsByRuleIds = (
    params: BulkFillGapsByRuleIdsParams,
    options: BulkFillGapsByRuleIdsOptions
  ) => bulkFillGapsByRuleIds(this.context, params, options);

  public getRuleIdsWithGaps = (params: GetRuleIdsWithGapsParams) =>
    getRuleIdsWithGaps(this.context, params);

  public getGapsSummaryByRuleIds = (params: GetGapsSummaryByRuleIdsParams) =>
    getGapsSummaryByRuleIds(this.context, params);

  public getRuleTypesByQuery = (params: GetRuleTypesByQueryParams) =>
    getRuleTypesByQuery(this.context, params);

  public async createESQLRule(
    ruleData: CreateRuleData<RuleParamsV1>,
    track?: {
      recovery?: {
        enabled?: boolean;
        schedule?: string;
        lookbackWindow?: string;
        recoveryQuery?: string;
      };
    }
  ): Promise<SanitizedRule<RuleParamsV1>> {
    const createdRule = (await this.create<RuleParamsV1>({
      data: ruleData,
    })) as SanitizedRule<RuleParamsV1>;

    if (track?.recovery?.enabled) {
      await createRecoveryRule(this.context, createdRule, ruleData, track);
    }

    return createdRule;
  }
}

// The createRecoveryRule logic needs to be a method on the RulesClient class
// to have the correct 'this' context.
async function createRecoveryRule(
  context: RulesClientContext,
  parentRule: SanitizedRule<RuleParamsV1>,
  ruleData: CreateRuleData<RuleParamsV1>,
  track: {
    recovery?: {
      enabled?: boolean;
      schedule?: string;
      lookbackWindow?: string;
      recoveryQuery?: string;
    };
  }
) {
  if (!track?.recovery?.enabled) {
    return;
  }

  try {
    let recoveryEsql: string;

    if (track.recovery.recoveryQuery) {
      const groupKeys = ruleData.params.group_key ?? [];
      const groupKeyFields = groupKeys.map((key) => `attrs.${key}`).join(', ');
      const groupKeyConditions = groupKeys.map((key) => `attrs.${key} IS NOT NULL`).join(' AND ');

      recoveryEsql = track.recovery.recoveryQuery
        .replace(/\?rule_id/g, `"${parentRule.id}"`)
        .replace(/\?group_key_fields/g, groupKeyFields)
        .replace(/\?group_key_conditions/g, groupKeyConditions);
    } else {
      const groupKeys = ruleData.params.group_key ?? [];
      if (groupKeys.length === 0) {
        context.logger.error(
          `Cannot create recovery rule for parent rule "${ruleData.name}" (${parentRule.id}) because 'group_key' is not defined.`
        );
        return;
      }

      const groupKeyColumns = groupKeys.map((key) =>
        Builder.expression.column(['attrs', ...key.split('.')])
      );

      const fromCommand = Builder.command({
        name: 'from',
        args: [Builder.expression.literal.string('.internal.alerts-stack.alerts-default-*')],
      });

      const initialWhereCommand = Builder.command({
        name: 'where',
        args: [
          Builder.expression.func.binary('==', [
            Builder.expression.column(['rule', 'id']),
            Builder.expression.literal.string(parentRule.id),
          ]),
        ],
      });

      const statsCommand = Builder.command({
        name: 'stats',
        args: [
          Builder.expression.func.binary('=', [
            Builder.identifier('last_seen_run_id'),
            Builder.expression.func.call('MAX', [Builder.expression.column(['run', 'id'])]),
          ]),
          Builder.option({
            name: 'by',
            args: [Builder.expression.column(['rule', 'id']), ...groupKeyColumns],
          }),
        ],
      });

      const inlineStatsCommand = Builder.command({
        name: 'INLINE STATS',
        args: [
          Builder.expression.func.binary('=', [
            Builder.identifier('max_run_id'),
            Builder.expression.func.call('MAX', [Builder.expression.column('last_seen_run_id')]),
          ]),
        ],
      });

      const notNullConditions = groupKeyColumns.map((col) =>
        Builder.expression.func.postfix('IS NOT NULL', col)
      );
      const combinedNotNullCondition = notNullConditions.reduce((acc, condition) =>
        Builder.expression.func.binary('AND', [acc, condition])
      );

      const secondaryWhereCondition = Builder.expression.func.binary('AND', [
        Builder.expression.func.binary('<', [
          Builder.expression.column('last_seen_run_id'),
          Builder.expression.column('max_run_id'),
        ]),
        combinedNotNullCondition,
      ]);

      const secondaryWhereCommand = Builder.command({
        name: 'where',
        args: [secondaryWhereCondition],
      });

      const evalCommand = Builder.command({
        name: 'eval',
        args: [
          Builder.expression.func.binary('=', [
            Builder.identifier('status'),
            Builder.expression.literal.string('recovered'),
          ]),
        ],
      });

      const keepCommand = Builder.command({
        name: 'keep',
        args: [
          Builder.expression.column(['rule', 'id']),
          ...groupKeyColumns,
          Builder.expression.column('status'),
          Builder.expression.column('last_seen_run_id'),
          Builder.expression.column('max_run_id'),
        ],
      });

      const recoveryAst = Builder.expression.query([
        fromCommand,
        initialWhereCommand,
        statsCommand,
        inlineStatsCommand,
        secondaryWhereCommand,
        evalCommand,
        keepCommand,
      ]);

      const recoveryEsqlQuery = new EsqlQuery(recoveryAst);
      recoveryEsql = recoveryEsqlQuery.print();
    }

    const recoveryLookbackWindow =
      track.recovery.lookbackWindow ||
      `${ruleData.params.timeWindowSize}${ruleData.params.timeWindowUnit}`;
    const durationMatch = recoveryLookbackWindow.match(/^(\d+)([smhd])$/);
    const timeWindowSize = durationMatch
      ? parseInt(durationMatch[1], 10)
      : ruleData.params.timeWindowSize;
    const timeWindowUnit = durationMatch ? durationMatch[2] : ruleData.params.timeWindowUnit;

    const recoveryRuleData: CreateRuleData<RuleParamsV1> = {
      ...ruleData,
      name: `${ruleData.name} - RECOVERY`,
      tags: [...(ruleData.tags || []), 'internal'],
      schedule: {
        interval: track.recovery.schedule || ruleData.schedule.interval,
      },
      params: {
        ...ruleData.params,
        parentId: parentRule.id,
        role: 'recovery',
        esqlQuery: {
          esql: recoveryEsql,
        },
        timeWindowSize,
        timeWindowUnit,
      },
    };

    await createRule(context, { data: recoveryRuleData });
  } catch (e) {
    context.logger.error(`Failed to create recovery rule for parent rule ${parentRule.id}.`, e);
    // Re-throw the error to ensure the API call fails
    throw e;
  }
}
