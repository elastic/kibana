/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { TaskRunnerApi } from '../api';
import { usePolling } from '../hooks/use_polling';
import { TasksTable } from './tasks_table';

interface JobTasksProps {
  api: TaskRunnerApi;
  share: SharePluginStart;
  jobId: string;
  pollIntervalMs: number;
}

/** A job's recent tasks, polled while its row is expanded. */
export const JobTasks = ({ api, share, jobId, pollIntervalMs }: JobTasksProps) => {
  const listJobTasks = useCallback(() => api.listJobTasks(jobId), [api, jobId]);
  const tasks = usePolling(listJobTasks, pollIntervalMs);

  return (
    <div data-test-subj={`taskRunnerPocJobTasks-${jobId}`}>
      <EuiTitle size="xxs">
        <h4>Recent tasks</h4>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {jobId}
      </EuiText>
      <EuiSpacer size="s" />
      {tasks.error ? (
        <>
          <KbnDangerCallout announceOnMount size="s" title="Couldn't load this job's tasks">
            {tasks.error}
          </KbnDangerCallout>
          <EuiSpacer size="s" />
        </>
      ) : null}
      <TasksTable
        api={api}
        share={share}
        tasks={tasks.data?.tasks}
        noItemsMessage="This job hasn't fired yet."
        data-test-subj="taskRunnerPocJobTasksTable"
      />
    </div>
  );
};
