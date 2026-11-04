/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { TaskDetails, TaskTreeResponse } from '@kbn/task-manager-plugin/common';
import type { TasksApi } from './api';
import { RollupBadges, StatusBadge } from './status_badge';

interface TaskFlyoutProps {
  api: TasksApi;
  taskId: string;
  onClose: () => void;
  onSelectTask: (id: string) => void;
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

export const TaskFlyout = ({ api, taskId, onClose, onSelectTask }: TaskFlyoutProps) => {
  const [task, setTask] = useState<TaskDetails | null>(null);
  const [tree, setTree] = useState<TaskTreeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setTask(null);
    setTree(null);
    setError(null);
    api
      .getTask(taskId, controller.signal)
      .then(async ({ task: details }) => {
        setTask(details);
        if (details.has_children || details.root_id) {
          const { root_id: rootId } = details;
          setTree(await api.getTree(rootId ?? details.id, controller.signal));
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err?.body?.message ?? err?.message ?? String(err));
        }
      });
    return () => controller.abort();
  }, [api, taskId]);

  const parentId = task?.parent_id ?? null;

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus aria-labelledby="taskFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="taskFlyoutTitle">{taskId}</h2>
        </EuiTitle>
        {task && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <StatusBadge task={task} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {task.task_type}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {error && (
          <KbnDangerCallout
            announceOnMount
            title={i18n.translate('xpack.taskManagerUi.backgroundTasks.flyout.loadError', {
              defaultMessage: 'Could not load the task',
            })}
          >
            {error}
          </KbnDangerCallout>
        )}
        {!task && !error && <EuiLoadingSpinner size="l" />}
        {task && (
          <>
            <EuiDescriptionList
              type="column"
              compressed
              listItems={[
                { title: 'Attempts', description: String(task.attempts) },
                { title: 'Run at', description: formatDate(task.run_at) },
                { title: 'Scheduled at', description: formatDate(task.scheduled_at) },
                { title: 'Started at', description: formatDate(task.started_at) },
                { title: 'Retry at', description: formatDate(task.retry_at) },
                { title: 'Owner', description: task.owner_id ?? '—' },
                {
                  title: 'Schedule',
                  description: task.schedule ? JSON.stringify(task.schedule) : 'ad-hoc',
                },
                { title: 'Priority', description: task.priority ?? '—' },
                { title: 'Scope', description: task.scope?.join(', ') ?? '—' },
                { title: 'Space', description: task.space_id ?? '—' },
                { title: 'Timeout override', description: task.timeout_override ?? '—' },
                ...(parentId
                  ? [
                      {
                        title: 'Parent',
                        description: (
                          <EuiLink onClick={() => onSelectTask(parentId)}>{parentId}</EuiLink>
                        ),
                      },
                      { title: 'Root', description: task.root_id ?? '—' },
                      { title: 'Depth', description: String(task.depth) },
                      { title: 'Child key', description: task.child_key ?? '—' },
                    ]
                  : []),
              ]}
            />

            {tree && (
              <>
                <EuiSpacer />
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.taskManagerUi.backgroundTasks.flyout.treeTitle', {
                      defaultMessage: 'Task tree ({count} tasks)',
                      values: { count: tree.rollup.total },
                    })}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                  <RollupBadges rollup={tree.rollup} />
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <ul>
                    {tree.nodes.map((node) => (
                      <li key={node.id} style={{ marginLeft: node.depth * 16 }}>
                        <EuiLink onClick={() => onSelectTask(node.id)}>
                          {node.child_key ?? node.id}
                        </EuiLink>{' '}
                        <StatusBadge task={node} />{' '}
                        <EuiText size="xs" color="subdued" component="span">
                          {node.task_type}
                        </EuiText>
                      </li>
                    ))}
                  </ul>
                </EuiText>
              </>
            )}

            <EuiSpacer />
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.taskManagerUi.backgroundTasks.flyout.stateTitle', {
                  defaultMessage: 'State',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="json" isCopyable overflowHeight={300} fontSize="s">
              {JSON.stringify(task.state, null, 2)}
            </EuiCodeBlock>

            <EuiSpacer />
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.taskManagerUi.backgroundTasks.flyout.paramsTitle', {
                  defaultMessage: 'Params',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="json" isCopyable overflowHeight={300} fontSize="s">
              {JSON.stringify(task.params, null, 2)}
            </EuiCodeBlock>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
