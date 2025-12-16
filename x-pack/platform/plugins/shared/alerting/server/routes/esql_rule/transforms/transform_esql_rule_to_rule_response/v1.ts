/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ESQLParamsV1 } from '@kbn/response-ops-rule-params';
import type { ESQLRuleResponseV1 } from '../../../../../common/routes/esql_rule/response';
import type { Rule } from '../../../../application/rule/types';
import {
  transformRuleActionsV1,
  transformMonitoringV1,
  transformRuleLastRunV1,
  transformFlappingV1,
} from '../../../rule/transforms';

export const transformESQLRuleToResponse = (rule: Rule<ESQLParamsV1>): ESQLRuleResponseV1 => ({
  id: rule.id,
  enabled: rule.enabled,
  name: rule.name,
  tags: rule.tags,
  rule_type_id: rule.alertTypeId,
  consumer: rule.consumer,
  schedule: rule.schedule,
  internal: rule.internal ?? false,
  actions: transformRuleActionsV1(rule.actions, rule.systemActions ?? []),
  params: rule.params,
  ...(rule.mapped_params ? { mapped_params: rule.mapped_params } : {}),
  ...(rule.scheduledTaskId !== undefined ? { scheduled_task_id: rule.scheduledTaskId } : {}),
  created_by: rule.createdBy,
  updated_by: rule.updatedBy,
  created_at: rule.createdAt.toISOString(),
  updated_at: rule.updatedAt.toISOString(),
  api_key_owner: rule.apiKeyOwner,
  ...(rule.apiKeyCreatedByUser !== undefined
    ? { api_key_created_by_user: rule.apiKeyCreatedByUser }
    : {}),
  ...(rule.throttle !== undefined ? { throttle: rule.throttle } : {}),
  mute_all: rule.muteAll,
  ...(rule.notifyWhen !== undefined ? { notify_when: rule.notifyWhen } : {}),
  muted_alert_ids: rule.mutedInstanceIds,
  ...(rule.scheduledTaskId !== undefined ? { scheduled_task_id: rule.scheduledTaskId } : {}),
  ...(rule.executionStatus
    ? {
        execution_status: {
          status: rule.executionStatus.status,
          ...(rule.executionStatus.error ? { error: rule.executionStatus.error } : {}),
          ...(rule.executionStatus.warning ? { warning: rule.executionStatus.warning } : {}),
          last_execution_date: rule.executionStatus.lastExecutionDate?.toISOString(),
          ...(rule.executionStatus.lastDuration !== undefined
            ? { last_duration: rule.executionStatus.lastDuration }
            : {}),
        },
      }
    : {}),
  ...(rule.monitoring ? { monitoring: transformMonitoringV1(rule.monitoring) } : {}),
  ...(rule.snoozeSchedule ? { snooze_schedule: rule.snoozeSchedule } : {}),
  ...(rule.activeSnoozes ? { active_snoozes: rule.activeSnoozes } : {}),
  ...(rule.isSnoozedUntil !== undefined
    ? { is_snoozed_until: rule.isSnoozedUntil?.toISOString() || null }
    : {}),
  ...(rule.lastRun !== undefined
    ? { last_run: rule.lastRun ? transformRuleLastRunV1(rule.lastRun) : null }
    : {}),
  ...(rule.nextRun !== undefined ? { next_run: rule.nextRun?.toISOString() || null } : {}),
  revision: rule.revision,
  ...(rule.running !== undefined ? { running: rule.running } : {}),
  ...(rule.viewInAppRelativeUrl !== undefined
    ? { view_in_app_relative_url: rule.viewInAppRelativeUrl }
    : {}),
  ...(rule.alertDelay !== undefined ? { alert_delay: rule.alertDelay } : {}),
  ...(rule.flapping !== undefined ? { flapping: transformFlappingV1(rule.flapping) } : {}),
  ...(rule.artifacts ? { artifacts: rule.artifacts } : {}),
});
