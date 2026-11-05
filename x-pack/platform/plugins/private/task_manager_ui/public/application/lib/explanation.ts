/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  TaskExplanationReason,
  TaskExplanationVerdict,
} from '@kbn/task-manager-plugin/common';
import { EMPTY_VALUE, formatDateTime, formatDuration, formatRelativeTime } from './format';

export const getVerdictTitle = (verdict: TaskExplanationVerdict): string => {
  switch (verdict) {
    case 'blocked':
      return i18n.translate('xpack.taskManagerUi.explanation.verdict.blocked', {
        defaultMessage: "This task won't run",
      });
    case 'attention':
      return i18n.translate('xpack.taskManagerUi.explanation.verdict.attention', {
        defaultMessage: 'This task needs attention',
      });
    case 'ok':
      return i18n.translate('xpack.taskManagerUi.explanation.verdict.ok', {
        defaultMessage: 'This task is on track',
      });
  }
};

export const getReasonMessage = (reason: TaskExplanationReason): string => {
  switch (reason.code) {
    case 'type_not_registered':
      return i18n.translate('xpack.taskManagerUi.explanation.typeNotRegistered', {
        defaultMessage:
          'No plugin on this Kibana node registers this task type. The task can only run on a node where its plugin is enabled.',
      });
    case 'unrecognized':
      return i18n.translate('xpack.taskManagerUi.explanation.unrecognized', {
        defaultMessage:
          'Task Manager marked this task as unrecognized because its task type is no longer registered.',
      });
    case 'type_excluded':
      return i18n.translate('xpack.taskManagerUi.explanation.typeExcluded', {
        defaultMessage:
          'This task type is excluded by xpack.task_manager.unsafe.exclude_task_types on this Kibana node.',
      });
    case 'execution_paused':
      return i18n.translate('xpack.taskManagerUi.explanation.executionPaused', {
        defaultMessage: 'Task execution is paused for the whole cluster.',
      });
    case 'task_type_paused':
      return i18n.translate('xpack.taskManagerUi.explanation.taskTypePaused', {
        defaultMessage: 'Task execution is paused for this task type.',
      });
    case 'disabled':
      return i18n.translate('xpack.taskManagerUi.explanation.disabled', {
        defaultMessage: 'The task is disabled, so Task Manager will not claim it.',
      });
    case 'failed':
      return i18n.translate('xpack.taskManagerUi.explanation.failed', {
        defaultMessage:
          'The task failed after {attempts} of {maxAttempts} attempts and will not be retried.',
        values: { attempts: reason.attempts, maxAttempts: reason.max_attempts },
      });
    case 'dead_letter':
      return i18n.translate('xpack.taskManagerUi.explanation.deadLetter', {
        defaultMessage: 'The task was moved to the dead letter state and will not run again.',
      });
    case 'should_delete':
      return i18n.translate('xpack.taskManagerUi.explanation.shouldDelete', {
        defaultMessage: 'The task is marked for deletion.',
      });
    case 'running':
      return i18n.translate('xpack.taskManagerUi.explanation.running', {
        defaultMessage:
          'The task is running on Kibana node {ownerId}. It times out and becomes available to other nodes at {retryAt}.',
        values: {
          ownerId: reason.owner_id ?? EMPTY_VALUE,
          retryAt: formatDateTime(reason.retry_at),
        },
      });
    case 'stuck':
      return i18n.translate('xpack.taskManagerUi.explanation.stuck', {
        defaultMessage:
          'The task was claimed by Kibana node {ownerId} but did not finish before {retryAt}. Another node will pick it up on its next claim cycle.',
        values: {
          ownerId: reason.owner_id ?? EMPTY_VALUE,
          retryAt: formatDateTime(reason.retry_at),
        },
      });
    case 'scheduled':
      return i18n.translate('xpack.taskManagerUi.explanation.scheduled', {
        defaultMessage: 'The task is scheduled to run {runAt}.',
        values: { runAt: formatRelativeTime(reason.run_at) },
      });
    case 'due':
      return i18n.translate('xpack.taskManagerUi.explanation.due', {
        defaultMessage: 'The task is due and waiting for the next claim cycle.',
      });
    case 'overdue':
      return i18n.translate('xpack.taskManagerUi.explanation.overdue', {
        defaultMessage:
          'The task is {duration} overdue. Common causes: the Kibana nodes have no free capacity, this task type reached its maximum concurrency, or the node that owns the task partition is down.',
        values: { duration: formatDuration(reason.overdue_ms) },
      });
    case 'removed':
      return i18n.translate('xpack.taskManagerUi.explanation.removed', {
        defaultMessage:
          'This task no longer exists. One-time tasks are removed once they succeed or run out of attempts, and plugins remove tasks they no longer need. Only its run history remains.',
      });
    case 'last_run_failed': {
      const failedAt = formatRelativeTime(reason.failed_at);
      if (reason.runs_checked > 1 && reason.consecutive_failures === reason.runs_checked) {
        return i18n.translate('xpack.taskManagerUi.explanation.allRecentRunsFailed', {
          defaultMessage: 'All of the last {count} recorded runs failed, most recently {failedAt}.',
          values: { count: reason.consecutive_failures, failedAt },
        });
      }
      return i18n.translate('xpack.taskManagerUi.explanation.lastRunFailed', {
        defaultMessage:
          '{count, plural, one {The last run failed {failedAt}.} other {The last # runs failed, most recently {failedAt}.}}',
        values: { count: reason.consecutive_failures, failedAt },
      });
    }
  }
};
