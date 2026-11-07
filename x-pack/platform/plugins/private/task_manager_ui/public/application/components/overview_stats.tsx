/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { TaskManagerUiOverviewResponse } from '@kbn/task-manager-plugin/common';
import { formatPercent } from '../lib/format';

interface StatProps {
  title: string;
  description: string;
  color?: 'default' | 'danger' | 'success' | 'subdued';
  isLoading: boolean;
  testSubj: string;
}

const Stat: React.FC<StatProps> = ({ title, description, color, isLoading, testSubj }) => (
  <EuiFlexItem>
    <EuiPanel hasBorder paddingSize="m">
      <EuiStat
        title={title}
        description={description}
        titleColor={color}
        titleSize="m"
        isLoading={isLoading}
        data-test-subj={testSubj}
      />
    </EuiPanel>
  </EuiFlexItem>
);

export const OverviewStats: React.FC<{
  overview?: TaskManagerUiOverviewResponse;
  isLoading: boolean;
}> = ({ overview, isLoading }) => {
  const overdue = overview?.totals.overdue ?? 0;
  const runs = (overview?.task_types ?? []).reduce(
    (acc, { runs: typeRuns }) => ({
      success: acc.success + (typeRuns?.success ?? 0),
      failure: acc.failure + (typeRuns?.failure ?? 0),
      failedTasks: acc.failedTasks + (typeRuns?.failed_tasks ?? 0),
    }),
    { success: 0, failure: 0, failedTasks: 0 }
  );
  const totalRuns = runs.success + runs.failure;
  const failureRate = totalRuns > 0 ? runs.failure / totalRuns : undefined;

  return (
    <EuiFlexGroup gutterSize="m" wrap>
      <Stat
        title={(overview?.totals.tasks ?? 0).toLocaleString()}
        description={i18n.translate('xpack.taskManagerUi.overview.tasks', {
          defaultMessage: 'Tasks',
        })}
        isLoading={isLoading}
        testSubj="taskManagerUiStatTasks"
      />
      <Stat
        title={overdue.toLocaleString()}
        description={i18n.translate('xpack.taskManagerUi.overview.overdue', {
          defaultMessage: 'Overdue tasks',
        })}
        color={overdue > 0 ? 'danger' : 'default'}
        isLoading={isLoading}
        testSubj="taskManagerUiStatOverdue"
      />
      <Stat
        title={runs.failedTasks.toLocaleString()}
        description={i18n.translate('xpack.taskManagerUi.overview.tasksWithFailures', {
          defaultMessage: 'Tasks with failures in time range',
        })}
        color={runs.failedTasks > 0 ? 'danger' : 'default'}
        isLoading={isLoading}
        testSubj="taskManagerUiStatTasksWithFailures"
      />
      <Stat
        title={totalRuns.toLocaleString()}
        description={i18n.translate('xpack.taskManagerUi.overview.runs', {
          defaultMessage: 'Runs in time range',
        })}
        isLoading={isLoading}
        testSubj="taskManagerUiStatRuns"
      />
      <Stat
        title={formatPercent(failureRate)}
        description={i18n.translate('xpack.taskManagerUi.overview.failureRate', {
          defaultMessage: 'Run failure rate in time range',
        })}
        color={failureRate ? 'danger' : 'default'}
        isLoading={isLoading}
        testSubj="taskManagerUiStatFailureRate"
      />
      <Stat
        title={(overview?.nodes.length ?? 0).toLocaleString()}
        description={i18n.translate('xpack.taskManagerUi.overview.nodes', {
          defaultMessage: 'Active Kibana nodes',
        })}
        isLoading={isLoading}
        testSubj="taskManagerUiStatNodes"
      />
    </EuiFlexGroup>
  );
};

export const OverviewCallouts: React.FC<{ overview?: TaskManagerUiOverviewResponse }> = ({
  overview,
}) => {
  if (!overview) {
    return null;
  }
  const { execution_control: executionControl, excluded_task_types: excludedTaskTypes } = overview;
  const callouts: React.ReactNode[] = [];

  if (executionControl.paused) {
    callouts.push(
      <KbnDangerCallout
        announceOnMount
        key="paused"
        data-test-subj="taskManagerUiPausedCallout"
        title={i18n.translate('xpack.taskManagerUi.overview.pausedTitle', {
          defaultMessage: 'Task execution is paused for the whole cluster',
        })}
      />
    );
  }
  if (executionControl.paused_task_types.length > 0) {
    callouts.push(
      <KbnWarningCallout
        announceOnMount
        key="pausedTypes"
        data-test-subj="taskManagerUiPausedTypesCallout"
        title={i18n.translate('xpack.taskManagerUi.overview.pausedTypesTitle', {
          defaultMessage: 'Task execution is paused for: {taskTypes}',
          values: { taskTypes: executionControl.paused_task_types.join(', ') },
        })}
      />
    );
  }
  if (excludedTaskTypes.length > 0) {
    callouts.push(
      <KbnWarningCallout
        announceOnMount
        key="excluded"
        data-test-subj="taskManagerUiExcludedCallout"
        title={i18n.translate('xpack.taskManagerUi.overview.excludedTitle', {
          defaultMessage: 'This Kibana node excludes task types: {taskTypes}',
          values: { taskTypes: excludedTaskTypes.join(', ') },
        })}
      />
    );
  }
  if (!overview.event_log_available) {
    callouts.push(
      <KbnInfoCallout
        announceOnMount
        key="eventLog"
        data-test-subj="taskManagerUiNoEventLogCallout"
        title={i18n.translate('xpack.taskManagerUi.overview.noEventLogTitle', {
          defaultMessage: 'Run history is unavailable because the event log is not available.',
        })}
      />
    );
  }

  return callouts.length > 0 ? (
    <>
      {callouts.map((callout, index) => (
        <React.Fragment key={index}>
          {index > 0 && <EuiSpacer size="s" />}
          {callout}
        </React.Fragment>
      ))}
      <EuiSpacer size="l" />
    </>
  ) : null;
};
