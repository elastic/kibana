/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { Job } from '../../common';
import type { TaskRunnerApi } from '../api';
import { formatTime } from '../lib/format';
import { jobFiresText } from '../lib/jobs';
import { JobTasks } from './job_tasks';
import { StatusBadge } from './status_badge';

interface JobsTableProps {
  api: TaskRunnerApi;
  share: SharePluginStart;
  jobs: Job[] | undefined;
  canWrite: boolean;
  pollIntervalMs: number;
  onDelete: (job: Job) => void;
}

export const JobsTable = ({
  api,
  share,
  jobs,
  canWrite,
  pollIntervalMs,
  onDelete,
}: JobsTableProps) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (jobId: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });

  const deleteLabel = canWrite
    ? 'Delete job'
    : 'You need the All privilege for Task runner (POC) to delete jobs';

  const columns: Array<EuiBasicTableColumn<Job>> = [
    {
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>Show recent tasks</span>
        </EuiScreenReaderOnly>
      ),
      render: (job: Job) => {
        const label = expanded.has(job.jobId) ? 'Hide recent tasks' : 'Show recent tasks';
        return (
          <EuiToolTip content={label} disableScreenReaderOutput>
            <EuiButtonIcon
              onClick={() => toggle(job.jobId)}
              aria-label={label}
              aria-expanded={expanded.has(job.jobId)}
              iconType={expanded.has(job.jobId) ? 'chevronSingleDown' : 'chevronSingleRight'}
              data-test-subj={`taskRunnerPocJobToggle-${job.jobId}`}
            />
          </EuiToolTip>
        );
      },
    },
    {
      name: 'Query',
      render: (job: Job) => (
        <EuiToolTip content={job.jobId}>
          <EuiCode transparentBackground>{job.params.query ?? job.taskType}</EuiCode>
        </EuiToolTip>
      ),
    },
    { name: 'Fires', width: '170px', render: jobFiresText },
    { field: 'nextFireAt', name: 'Next', width: '140px', render: formatTime },
    {
      field: 'running',
      name: 'Running',
      width: '90px',
      render: (running: boolean) =>
        running ? (
          <EuiBadge color="primary">running</EuiBadge>
        ) : (
          <EuiText size="s" color="subdued">
            idle
          </EuiText>
        ),
    },
    {
      name: 'Last task',
      width: '220px',
      render: (job: Job) =>
        job.lastTask ? (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <StatusBadge status={job.lastTask.status} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {formatTime(job.lastTask.finishedAt)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          '—'
        ),
    },
    {
      name: 'Actions',
      width: '70px',
      render: (job: Job) => (
        <EuiToolTip content={deleteLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            aria-label={deleteLabel}
            isDisabled={!canWrite}
            onClick={() => onDelete(job)}
            data-test-subj={`taskRunnerPocDeleteJob-${job.jobId}`}
          />
        </EuiToolTip>
      ),
    },
  ];

  const itemIdToExpandedRowMap = Object.fromEntries(
    (jobs ?? [])
      .filter(({ jobId }) => expanded.has(jobId))
      .map((job) => [
        job.jobId,
        <JobTasks api={api} share={share} jobId={job.jobId} pollIntervalMs={pollIntervalMs} />,
      ])
  );

  return (
    <EuiBasicTable<Job>
      tableCaption="Scheduled jobs"
      items={jobs ?? []}
      itemId="jobId"
      columns={columns}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      loading={jobs === undefined}
      noItemsMessage={
        jobs === undefined
          ? 'Loading jobs…'
          : 'No scheduled jobs. Turn on Repeat every or Run at to create one.'
      }
      data-test-subj="taskRunnerPocJobsTable"
    />
  );
};
