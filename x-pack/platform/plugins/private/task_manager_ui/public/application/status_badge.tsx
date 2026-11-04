/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TaskNode, TaskOutcomeRollup } from '@kbn/task-manager-plugin/common';

const STATUS_COLORS: Record<string, string> = {
  running: 'primary',
  claiming: 'primary',
  waiting: 'accent',
  idle: 'hollow',
  done: 'success',
  failed: 'danger',
  dead_letter: 'danger',
  cancelled: 'warning',
  unrecognized: 'warning',
};

export const StatusBadge = ({ task }: { task: TaskNode }) => {
  const flags: string[] = [];
  if (task.wake_requested) {
    flags.push(
      i18n.translate('xpack.taskManagerUi.backgroundTasks.wakeRequested', {
        defaultMessage: 'a sub-task finished; the next yield resumes at once',
      })
    );
  }
  if (task.cancel_requested) {
    flags.push(
      i18n.translate('xpack.taskManagerUi.backgroundTasks.cancelRequested', {
        defaultMessage: 'cancellation requested by the parent',
      })
    );
  }
  if (!task.enabled) {
    flags.push(
      i18n.translate('xpack.taskManagerUi.backgroundTasks.disabled', {
        defaultMessage: 'disabled',
      })
    );
  }
  const badge = (
    <EuiBadge color={STATUS_COLORS[task.status] ?? 'default'}>
      {task.status}
      {flags.length ? ' *' : ''}
    </EuiBadge>
  );
  return flags.length ? <EuiToolTip content={flags.join('; ')}>{badge}</EuiToolTip> : badge;
};

export const RollupBadges = ({ rollup }: { rollup: TaskOutcomeRollup }) => (
  <>
    {rollup.inProgress > 0 && (
      <EuiBadge color="primary">
        {i18n.translate('xpack.taskManagerUi.backgroundTasks.rollup.inProgress', {
          defaultMessage: '{count} in progress',
          values: { count: rollup.inProgress },
        })}
      </EuiBadge>
    )}
    {rollup.done > 0 && (
      <EuiBadge color="success">
        {i18n.translate('xpack.taskManagerUi.backgroundTasks.rollup.done', {
          defaultMessage: '{count} done',
          values: { count: rollup.done },
        })}
      </EuiBadge>
    )}
    {rollup.failed > 0 && (
      <EuiBadge color="danger">
        {i18n.translate('xpack.taskManagerUi.backgroundTasks.rollup.failed', {
          defaultMessage: '{count} failed',
          values: { count: rollup.failed },
        })}
      </EuiBadge>
    )}
    {rollup.cancelled > 0 && (
      <EuiBadge color="warning">
        {i18n.translate('xpack.taskManagerUi.backgroundTasks.rollup.cancelled', {
          defaultMessage: '{count} cancelled',
          values: { count: rollup.cancelled },
        })}
      </EuiBadge>
    )}
    {rollup.unrecognized > 0 && (
      <EuiBadge color="warning">
        {i18n.translate('xpack.taskManagerUi.backgroundTasks.rollup.unrecognized', {
          defaultMessage: '{count} unrecognized',
          values: { count: rollup.unrecognized },
        })}
      </EuiBadge>
    )}
  </>
);
