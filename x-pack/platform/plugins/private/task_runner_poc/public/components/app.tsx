/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { IToasts } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { PLUGIN_NAME } from '../../common';
import type { TaskRunnerApi } from '../api';
import { usePolling } from '../hooks/use_polling';
import { NewJobForm } from './new_job_form';
import { TasksTable } from './tasks_table';

const TASKS_POLL_INTERVAL_MS = 2000;

export interface AppProps {
  api: TaskRunnerApi;
  share: SharePluginStart;
  toasts: IToasts;
  projectId: string;
  canWrite: boolean;
}

export const App = ({ api, share, toasts, projectId, canWrite }: AppProps) => {
  const listTasks = useCallback(() => api.listTasks(), [api]);
  const tasks = usePolling(listTasks, TASKS_POLL_INTERVAL_MS);

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
            onCreated={tasks.refresh}
          />
        </EuiPanel>
        <EuiSpacer size="l" />
        <EuiPanel hasBorder>
          <EuiFlexGroup alignItems="baseline" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>Tasks</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {`Refreshes every ${TASKS_POLL_INTERVAL_MS / 1000} seconds`}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          {tasks.error ? (
            <>
              <KbnDangerCallout
                announceOnMount
                size="s"
                title="Couldn't load tasks"
                data-test-subj="taskRunnerPocTasksError"
              >
                {tasks.error}
              </KbnDangerCallout>
              <EuiSpacer size="m" />
            </>
          ) : null}
          <TasksTable api={api} share={share} tasks={tasks.data?.tasks} />
        </EuiPanel>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
