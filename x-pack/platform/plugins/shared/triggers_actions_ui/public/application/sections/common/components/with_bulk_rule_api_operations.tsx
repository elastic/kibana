/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  IExecutionLogResult,
  IExecutionErrorsResult,
  IExecutionKPIResult,
} from '@kbn/alerting-plugin/common';
import { AlertingFrameworkHealth } from '@kbn/alerting-types';
import { fetchAlertingFrameworkHealth as alertingFrameworkHealth } from '@kbn/alerts-ui-shared/src/common/apis/fetch_alerting_framework_health';
import { resolveRule } from '@kbn/response-ops-rule-form';
import { muteAlertInstance } from '@kbn/response-ops-alerts-apis/apis/mute_alert_instance';
import { unmuteAlertInstance } from '@kbn/response-ops-alerts-apis/apis/unmute_alert_instance';
import {
  Rule,
  RuleType,
  RuleTaskState,
  RuleSummary,
  ResolvedRule,
  SnoozeSchedule,
  BulkEditResponse,
  BulkOperationResponse,
  BulkOperationAttributesWithoutHttp,
  BulkDisableParamsWithoutHttp,
} from '../../../../types';
import type {
  LoadExecutionLogAggregationsProps,
  LoadGlobalExecutionLogAggregationsProps,
  LoadActionErrorLogProps,
  BulkSnoozeRulesProps,
  LoadExecutionKPIAggregationsProps,
  LoadGlobalExecutionKPIAggregationsProps,
  BulkUnsnoozeRulesProps,
} from '../../../lib/rule_api';
import { cloneRule } from '../../../lib/rule_api/clone';
import { loadRule } from '../../../lib/rule_api/get_rule';
import { loadRuleSummary } from '../../../lib/rule_api/rule_summary';
import { loadRuleTypes } from '../../../lib/rule_api/rule_types';
import {
  loadExecutionLogAggregations,
  loadGlobalExecutionLogAggregations,
} from '../../../lib/rule_api/load_execution_log_aggregations';
import { muteRules, muteRule } from '../../../lib/rule_api/mute';
import { unmuteRules, unmuteRule } from '../../../lib/rule_api/unmute';
import { loadRuleState } from '../../../lib/rule_api/state';
import { loadExecutionKPIAggregations } from '../../../lib/rule_api/load_execution_kpi_aggregations';
import { loadGlobalExecutionKPIAggregations } from '../../../lib/rule_api/load_global_execution_kpi_aggregations';
import { loadActionErrorLog } from '../../../lib/rule_api/load_action_error_log';
import { snoozeRule, bulkSnoozeRules } from '../../../lib/rule_api/snooze';
import { unsnoozeRule, bulkUnsnoozeRules } from '../../../lib/rule_api/unsnooze';
import { bulkDeleteRules } from '../../../lib/rule_api/bulk_delete';
import { bulkEnableRules } from '../../../lib/rule_api/bulk_enable';
import { bulkDisableRules } from '../../../lib/rule_api/bulk_disable';

import { useKibana } from '../../../../common/lib/kibana';

export interface ComponentOpts {
  muteRules: (rules: Rule[]) => Promise<void>;
  unmuteRules: (rules: Rule[]) => Promise<void>;
  muteRule: (rule: Rule) => Promise<void>;
  unmuteRule: (rule: Rule) => Promise<void>;
  muteAlertInstance: (rule: Rule, alertInstanceId: string) => Promise<void>;
  unmuteAlertInstance: (rule: Rule, alertInstanceId: string) => Promise<void>;
  loadRule: (id: Rule['id']) => Promise<Rule>;
  loadRuleState: (id: Rule['id']) => Promise<RuleTaskState>;
  loadRuleSummary: (id: Rule['id'], numberOfExecutions?: number) => Promise<RuleSummary>;
  loadRuleTypes: () => Promise<RuleType[]>;
  loadExecutionKPIAggregations: (
    props: LoadExecutionKPIAggregationsProps
  ) => Promise<IExecutionKPIResult>;
  loadExecutionLogAggregations: (
    props: LoadExecutionLogAggregationsProps
  ) => Promise<IExecutionLogResult>;
  loadGlobalExecutionLogAggregations: (
    props: LoadGlobalExecutionLogAggregationsProps
  ) => Promise<IExecutionLogResult>;
  loadGlobalExecutionKPIAggregations: (
    props: LoadGlobalExecutionKPIAggregationsProps
  ) => Promise<IExecutionKPIResult>;
  loadActionErrorLog: (props: LoadActionErrorLogProps) => Promise<IExecutionErrorsResult>;
  getHealth: () => Promise<AlertingFrameworkHealth>;
  resolveRule: (id: Rule['id']) => Promise<ResolvedRule>;
  snoozeRule: (rule: Rule, snoozeSchedule: SnoozeSchedule) => Promise<void>;
  bulkSnoozeRules: (props: BulkSnoozeRulesProps) => Promise<BulkEditResponse>;
  unsnoozeRule: (rule: Rule, scheduleIds?: string[]) => Promise<void>;
  bulkUnsnoozeRules: (props: BulkUnsnoozeRulesProps) => Promise<BulkEditResponse>;
  cloneRule: (ruleId: string) => Promise<Rule>;
  bulkDeleteRules: (props: BulkOperationAttributesWithoutHttp) => Promise<BulkOperationResponse>;
  bulkEnableRules: (props: BulkOperationAttributesWithoutHttp) => Promise<BulkOperationResponse>;
  bulkDisableRules: (props: BulkDisableParamsWithoutHttp) => Promise<BulkOperationResponse>;
}

export type PropsWithOptionalApiHandlers<T> = Omit<T, keyof ComponentOpts> & Partial<ComponentOpts>;

export function withBulkRuleOperations<T>(
  WrappedComponent: React.ComponentType<T & ComponentOpts>
): React.FunctionComponent<PropsWithOptionalApiHandlers<T>> {
  return (props: PropsWithOptionalApiHandlers<T>) => {
    const { http } = useKibana().services;
    return (
      <WrappedComponent
        {...(props as T)}
        muteRules={async (items: Rule[]) =>
          muteRules({
            http,
            ids: items.filter((item) => !isRuleMuted(item)).map((item) => item.id),
          })
        }
        unmuteRules={async (items: Rule[]) =>
          unmuteRules({ http, ids: items.filter(isRuleMuted).map((item) => item.id) })
        }
        muteRule={async (rule: Rule) => {
          if (!isRuleMuted(rule)) {
            return await muteRule({ http, id: rule.id });
          }
        }}
        unmuteRule={async (rule: Rule) => {
          if (isRuleMuted(rule)) {
            return await unmuteRule({ http, id: rule.id });
          }
        }}
        muteAlertInstance={async (rule: Rule, instanceId: string) => {
          if (!isAlertInstanceMuted(rule, instanceId)) {
            return muteAlertInstance({ http, id: rule.id, instanceId });
          }
        }}
        unmuteAlertInstance={async (rule: Rule, instanceId: string) => {
          if (isAlertInstanceMuted(rule, instanceId)) {
            return unmuteAlertInstance({ http, id: rule.id, instanceId });
          }
        }}
        loadRule={async (ruleId: Rule['id']) => loadRule({ http, ruleId })}
        loadRuleState={async (ruleId: Rule['id']) => loadRuleState({ http, ruleId })}
        loadRuleSummary={async (ruleId: Rule['id'], numberOfExecutions?: number) =>
          loadRuleSummary({ http, ruleId, numberOfExecutions })
        }
        loadRuleTypes={async () => loadRuleTypes({ http })}
        loadExecutionLogAggregations={async (loadProps: LoadExecutionLogAggregationsProps) =>
          loadExecutionLogAggregations({
            ...loadProps,
            http,
          })
        }
        loadGlobalExecutionLogAggregations={async (
          loadProps: LoadGlobalExecutionLogAggregationsProps
        ) =>
          loadGlobalExecutionLogAggregations({
            ...loadProps,
            http,
          })
        }
        loadActionErrorLog={async (loadProps: LoadActionErrorLogProps) =>
          loadActionErrorLog({
            ...loadProps,
            http,
          })
        }
        loadExecutionKPIAggregations={async (
          loadExecutionKPIAggregationProps: LoadExecutionKPIAggregationsProps
        ) =>
          loadExecutionKPIAggregations({
            ...loadExecutionKPIAggregationProps,
            http,
          })
        }
        loadGlobalExecutionKPIAggregations={async (
          loadGlobalExecutionKPIAggregationsProps: LoadGlobalExecutionKPIAggregationsProps
        ) =>
          loadGlobalExecutionKPIAggregations({
            ...loadGlobalExecutionKPIAggregationsProps,
            http,
          })
        }
        resolveRule={async (ruleId: Rule['id']) => resolveRule({ http, id: ruleId })}
        getHealth={async () => alertingFrameworkHealth({ http })}
        snoozeRule={async (rule: Rule, snoozeSchedule: SnoozeSchedule) => {
          return await snoozeRule({ http, id: rule.id, snoozeSchedule });
        }}
        bulkSnoozeRules={async (bulkSnoozeRulesProps: BulkSnoozeRulesProps) => {
          return await bulkSnoozeRules({ http, ...bulkSnoozeRulesProps });
        }}
        unsnoozeRule={async (rule: Rule, scheduleIds?: string[]) => {
          return await unsnoozeRule({ http, id: rule.id, scheduleIds });
        }}
        bulkUnsnoozeRules={async (bulkUnsnoozeRulesProps: BulkUnsnoozeRulesProps) => {
          return await bulkUnsnoozeRules({ http, ...bulkUnsnoozeRulesProps });
        }}
        cloneRule={async (ruleId: string) => {
          return await cloneRule({ http, ruleId });
        }}
        bulkDeleteRules={async (bulkDeleteProps: BulkOperationAttributesWithoutHttp) => {
          return await bulkDeleteRules({ http, ...bulkDeleteProps });
        }}
        bulkEnableRules={async (bulkEnableProps: BulkOperationAttributesWithoutHttp) => {
          return await bulkEnableRules({ http, ...bulkEnableProps });
        }}
        bulkDisableRules={async (bulkDisableProps: BulkDisableParamsWithoutHttp) => {
          return await bulkDisableRules({ http, ...bulkDisableProps });
        }}
      />
    );
  };
}

function isRuleMuted(rule: Rule) {
  return rule.muteAll === true;
}

function isAlertInstanceMuted(rule: Rule, instanceId: string) {
  return rule.mutedInstanceIds.findIndex((muted) => muted === instanceId) >= 0;
}
