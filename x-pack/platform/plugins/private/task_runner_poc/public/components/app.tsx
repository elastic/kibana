/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { IToasts, OverlayStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { PLUGIN_NAME } from '../../common';
import type { Job } from '../../common';
import type { TaskRunnerApi } from '../api';
import { errorMessage } from '../api';
import { usePolling } from '../hooks/use_polling';
import { isUpcoming } from '../lib/jobs';
import { JobsTable } from './jobs_table';
import { NewJobForm } from './new_job_form';
import { TasksTable } from './tasks_table';

const POLL_INTERVAL_MS = 2000;

export interface AppProps {
  api: TaskRunnerApi;
  share: SharePluginStart;
  toasts: IToasts;
  openConfirm: OverlayStart['openConfirm'];
  projectId: string;
  canWrite: boolean;
}

const ListPanel = ({
  title,
  error,
  errorTitle,
  children,
}: {
  title: string;
  error: string | undefined;
  errorTitle: string;
  children: ReactNode;
}) => (
  <EuiPanel hasBorder>
    <EuiFlexGroup alignItems="baseline" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs" color="subdued">
          {`Refreshes every ${POLL_INTERVAL_MS / 1000} seconds`}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    {error ? (
      <>
        <KbnDangerCallout announceOnMount size="s" title={errorTitle}>
          {error}
        </KbnDangerCallout>
        <EuiSpacer size="m" />
      </>
    ) : null}
    {children}
  </EuiPanel>
);

export const App = ({ api, share, toasts, openConfirm, projectId, canWrite }: AppProps) => {
  const listTasks = useCallback(() => api.listTasks(), [api]);
  const listJobs = useCallback(() => api.listJobs(), [api]);
  const tasks = usePolling(listTasks, POLL_INTERVAL_MS);
  const jobs = usePolling(listJobs, POLL_INTERVAL_MS);
  const { refresh: refreshTasks } = tasks;
  const { refresh: refreshJobs } = jobs;

  const jobsById = useMemo(
    () => new Map((jobs.data?.jobs ?? []).map((job) => [job.jobId, job])),
    [jobs.data]
  );
  const upcomingJobs = useMemo(() => jobs.data?.jobs.filter(isUpcoming), [jobs.data]);

  const onCreated = useCallback(() => {
    refreshTasks();
    refreshJobs();
  }, [refreshTasks, refreshJobs]);

  const deleteJob = async (job: Job) => {
    const confirmed = await openConfirm(
      `Job ${job.jobId} stops firing. A task in flight finishes normally.`,
      {
        title: 'Delete this job?',
        confirmButtonText: 'Delete job',
        buttonColor: 'danger',
        'data-test-subj': 'taskRunnerPocDeleteJobConfirm',
      }
    );
    if (!confirmed) {
      return;
    }
    try {
      await api.deleteJob(job.jobId);
      toasts.addSuccess(`Deleted job ${job.jobId}`);
      refreshJobs();
    } catch (error) {
      toasts.addDanger({ title: `Couldn't delete job ${job.jobId}`, text: errorMessage(error) });
    }
  };

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={PLUGIN_NAME}
        description="Submit ES|QL jobs to the task runner service and watch their tasks."
        rightSideItems={[
          <EuiBadge key="project" color="hollow" iconType="cluster">
            {`Project: ${projectId}`}
          </EuiBadge>,
        ]}
      />
      <KibanaPageTemplate.Section>
        <EuiPanel hasBorder>
          <EuiTitle size="xs">
            <h2>New job</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <NewJobForm
            api={api}
            share={share}
            toasts={toasts}
            projectId={projectId}
            canWrite={canWrite}
            onCreated={onCreated}
          />
        </EuiPanel>
        <EuiSpacer size="l" />
        <ListPanel title="Scheduled jobs" error={jobs.error} errorTitle="Couldn't load jobs">
          <JobsTable
            api={api}
            share={share}
            jobs={upcomingJobs}
            canWrite={canWrite}
            pollIntervalMs={POLL_INTERVAL_MS}
            onDelete={deleteJob}
          />
        </ListPanel>
        <EuiSpacer size="l" />
        <ListPanel title="Tasks" error={tasks.error} errorTitle="Couldn't load tasks">
          <TasksTable api={api} share={share} tasks={tasks.data?.tasks} jobsById={jobsById} />
        </ListPanel>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
