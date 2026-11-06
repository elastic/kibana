/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn, EuiDescriptionListProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiCopy,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  TaskExplanationReason,
  TaskExplanationVerdict,
  TaskFailuresInWindow,
  TaskManagerUiTaskDetailResponse,
  TaskRun,
  TaskTypeDefinitionSummary,
} from '@kbn/task-manager-plugin/common';
import {
  KbnDangerCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
  type KbnCalloutProps,
} from '@kbn/ui-callout';
import { useTaskDetail } from '../hooks/use_task_manager_queries';
import { getErrorMessage, getErrorStatusCode } from '../lib/errors';
import { getReasonMessage, getVerdictTitle } from '../lib/explanation';
import {
  EMPTY_VALUE,
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  formatSchedule,
} from '../lib/format';
import type { RunsTimeRange } from '../lib/runs_time_range';
import { TaskStatusBadge } from './task_status_badge';

const toListItems = (
  entries: Array<[string, string | undefined]>
): NonNullable<EuiDescriptionListProps['listItems']> =>
  entries.map(([title, description]) => ({
    title,
    description: description ?? EMPTY_VALUE,
  }));

const getTaskListItems = (task: NonNullable<TaskManagerUiTaskDetailResponse['task']>) => [
  {
    title: i18n.translate('xpack.taskManagerUi.flyout.status', { defaultMessage: 'Status' }),
    description: <TaskStatusBadge status={task.status} />,
  },
  ...toListItems([
    [
      i18n.translate('xpack.taskManagerUi.flyout.enabled', { defaultMessage: 'Enabled' }),
      task.enabled
        ? i18n.translate('xpack.taskManagerUi.flyout.yes', { defaultMessage: 'Yes' })
        : i18n.translate('xpack.taskManagerUi.flyout.no', { defaultMessage: 'No' }),
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.schedule', { defaultMessage: 'Schedule' }),
      formatSchedule(task.schedule),
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.runAt', { defaultMessage: 'Run at' }),
      formatDateTime(task.run_at),
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.scheduledAt', {
        defaultMessage: 'Scheduled at',
      }),
      formatDateTime(task.scheduled_at),
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.startedAt', { defaultMessage: 'Started at' }),
      formatDateTime(task.started_at),
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.retryAt', { defaultMessage: 'Retry at' }),
      formatDateTime(task.retry_at),
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.attempts', { defaultMessage: 'Attempts' }),
      String(task.attempts),
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.owner', { defaultMessage: 'Owner' }),
      task.owner_id ?? undefined,
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.partition', { defaultMessage: 'Partition' }),
      task.partition?.toString(),
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.priority', { defaultMessage: 'Priority' }),
      task.priority?.toString(),
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.scope', { defaultMessage: 'Scope' }),
      task.scope?.join(', '),
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.timeoutOverride', {
        defaultMessage: 'Timeout override',
      }),
      task.timeout_override,
    ],
  ]),
];

const getDefinitionListItems = (definition: TaskTypeDefinitionSummary) =>
  toListItems([
    [
      i18n.translate('xpack.taskManagerUi.flyout.definition.title', { defaultMessage: 'Title' }),
      definition.title,
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.definition.description', {
        defaultMessage: 'Description',
      }),
      definition.description,
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.definition.timeout', {
        defaultMessage: 'Timeout',
      }),
      definition.timeout,
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.definition.maxAttempts', {
        defaultMessage: 'Max attempts',
      }),
      String(definition.max_attempts),
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.definition.maxConcurrency', {
        defaultMessage: 'Max concurrency per node',
      }),
      definition.max_concurrency?.toString(),
    ],
    [
      i18n.translate('xpack.taskManagerUi.flyout.definition.cost', { defaultMessage: 'Cost' }),
      String(definition.cost),
    ],
  ]);

const COPY_NODE_ID_LABEL = i18n.translate('xpack.taskManagerUi.flyout.runs.copyNodeId', {
  defaultMessage: 'Copy node ID',
});

const NodeIdCell: React.FC<{ nodeId?: string }> = ({ nodeId }) =>
  nodeId ? (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} css={{ minWidth: 0 }}>
      <EuiFlexItem css={{ minWidth: 0 }}>
        <EuiToolTip content={nodeId} display="block" anchorClassName="eui-textTruncate">
          <span tabIndex={0}>{nodeId}</span>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={nodeId} beforeMessage={COPY_NODE_ID_LABEL}>
          {(copy) => (
            <EuiButtonIcon
              iconType="copy"
              size="xs"
              color="text"
              onClick={copy}
              aria-label={COPY_NODE_ID_LABEL}
              data-test-subj="taskManagerUiCopyNodeId"
            />
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <>{EMPTY_VALUE}</>
  );

const SHOW_FULL_ERROR_LABEL = i18n.translate('xpack.taskManagerUi.flyout.runs.showFullError', {
  defaultMessage: 'Show full error',
});

const FULL_ERROR_LABEL = i18n.translate('xpack.taskManagerUi.flyout.runs.fullError', {
  defaultMessage: 'Full error',
});

const ErrorMessageCell: React.FC<{ errorMessage?: string }> = ({ errorMessage }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  if (!errorMessage) {
    return <>{EMPTY_VALUE}</>;
  }
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} css={{ minWidth: 0 }}>
      <EuiFlexItem css={{ minWidth: 0 }}>
        <div className="eui-textTruncate">{errorMessage}</div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={FULL_ERROR_LABEL}
          button={
            <EuiToolTip content={SHOW_FULL_ERROR_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="maximize"
                size="xs"
                color="text"
                onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
                aria-label={SHOW_FULL_ERROR_LABEL}
                data-test-subj="taskManagerUiShowRunError"
              />
            </EuiToolTip>
          }
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          anchorPosition="downRight"
          panelPaddingSize="s"
        >
          <div css={{ inlineSize: 480, maxInlineSize: '80vw' }}>
            <EuiCodeBlock
              paddingSize="s"
              fontSize="s"
              whiteSpace="pre-wrap"
              overflowHeight={300}
              isCopyable
              data-test-subj="taskManagerUiRunError"
            >
              {errorMessage}
            </EuiCodeBlock>
          </div>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const RelativeTime: React.FC<{ value: string }> = ({ value }) => (
  <EuiToolTip content={formatDateTime(value)}>
    <span tabIndex={0}>{formatRelativeTime(value)}</span>
  </EuiToolTip>
);

const runColumns: Array<EuiBasicTableColumn<TaskRun>> = [
  {
    field: 'timestamp',
    name: i18n.translate('xpack.taskManagerUi.flyout.runs.time', { defaultMessage: 'Time' }),
    render: (timestamp: string) => <RelativeTime value={timestamp} />,
  },
  {
    field: 'outcome',
    name: i18n.translate('xpack.taskManagerUi.flyout.runs.outcome', {
      defaultMessage: 'Outcome',
    }),
    render: (outcome?: string) =>
      outcome ? (
        <EuiBadge color={outcome === 'success' ? 'success' : 'danger'}>{outcome}</EuiBadge>
      ) : (
        EMPTY_VALUE
      ),
  },
  {
    field: 'duration_ms',
    name: i18n.translate('xpack.taskManagerUi.flyout.runs.duration', {
      defaultMessage: 'Duration',
    }),
    render: (durationMs?: number) => formatDuration(durationMs),
  },
  {
    field: 'schedule_delay_ms',
    name: i18n.translate('xpack.taskManagerUi.flyout.runs.delay', {
      defaultMessage: 'Start delay',
    }),
    render: (delayMs?: number) => formatDuration(delayMs),
  },
  {
    field: 'node_id',
    name: i18n.translate('xpack.taskManagerUi.flyout.runs.node', { defaultMessage: 'Node' }),
    render: (nodeId?: string) => <NodeIdCell nodeId={nodeId} />,
  },
  {
    field: 'error_message',
    name: i18n.translate('xpack.taskManagerUi.flyout.runs.error', { defaultMessage: 'Error' }),
    truncateText: true,
    render: (errorMessage?: string) => <ErrorMessageCell errorMessage={errorMessage} />,
  },
];

const VERDICT_CALLOUTS: Record<TaskExplanationVerdict, React.FC<KbnCalloutProps>> = {
  blocked: KbnDangerCallout,
  attention: KbnWarningCallout,
  ok: KbnSuccessCallout,
};

const ExplanationReason: React.FC<{ reason: TaskExplanationReason }> = ({ reason }) => (
  <li>
    {getReasonMessage(reason)}
    {reason.code === 'last_run_failed' && reason.error_message && (
      <>
        <EuiSpacer size="xs" />
        <EuiCodeBlock
          paddingSize="s"
          fontSize="s"
          whiteSpace="pre-wrap"
          overflowHeight={200}
          isCopyable
          data-test-subj="taskManagerUiLastRunError"
        >
          {reason.error_message}
        </EuiCodeBlock>
      </>
    )}
  </li>
);

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <>
    <EuiSpacer size="l" />
    <EuiTitle size="xs">
      <h3>{title}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />
  </>
);

const FailuresInWindow: React.FC<{
  failures: TaskFailuresInWindow;
  /** Whether the error of the latest failure is already shown by the explanation. */
  isErrorExplained: boolean;
}> = ({ failures: { window, count, last_failure: lastFailure }, isErrorExplained }) => (
  <div data-test-subj="taskManagerUiFailuresInWindow">
    <SectionTitle
      title={i18n.translate('xpack.taskManagerUi.flyout.failuresInWindow.title', {
        defaultMessage: 'Failures in time range',
      })}
    />
    <EuiDescriptionList
      type="column"
      compressed
      columnWidths={[1, 2]}
      listItems={[
        {
          title: i18n.translate('xpack.taskManagerUi.flyout.failuresInWindow.timeRange', {
            defaultMessage: 'Time range',
          }),
          description: i18n.translate(
            'xpack.taskManagerUi.flyout.failuresInWindow.timeRangeValue',
            {
              defaultMessage: '{start} to {end}',
              values: { start: formatDateTime(window.start), end: formatDateTime(window.end) },
            }
          ),
        },
        {
          title: i18n.translate('xpack.taskManagerUi.flyout.failuresInWindow.count', {
            defaultMessage: 'Failed runs',
          }),
          description: count.toLocaleString(),
        },
        {
          title: i18n.translate('xpack.taskManagerUi.flyout.failuresInWindow.lastFailure', {
            defaultMessage: 'Last failure',
          }),
          description: <RelativeTime value={lastFailure.at} />,
        },
      ]}
    />
    {lastFailure.error_message && !isErrorExplained && (
      <>
        <EuiSpacer size="s" />
        <EuiCodeBlock
          paddingSize="s"
          fontSize="s"
          whiteSpace="pre-wrap"
          overflowHeight={200}
          isCopyable
          data-test-subj="taskManagerUiLastFailureError"
        >
          {lastFailure.error_message}
        </EuiCodeBlock>
      </>
    )}
  </div>
);

const TaskDetail: React.FC<{ detail: TaskManagerUiTaskDetailResponse }> = ({ detail }) => {
  const {
    task,
    explanation,
    definition,
    recent_runs: recentRuns,
    failures_in_window: failuresInWindow,
  } = detail;
  const VerdictCallout = VERDICT_CALLOUTS[explanation.verdict];
  const lastRunFailure = explanation.reasons.find(
    (reason): reason is Extract<TaskExplanationReason, { code: 'last_run_failed' }> =>
      reason.code === 'last_run_failed'
  );
  return (
    <>
      <VerdictCallout
        title={getVerdictTitle(explanation.verdict)}
        text={
          explanation.reasons.length > 0 ? (
            <ul>
              {explanation.reasons.map((reason) => (
                <ExplanationReason key={reason.code} reason={reason} />
              ))}
            </ul>
          ) : undefined
        }
        data-test-subj="taskManagerUiExplanation"
      />

      {failuresInWindow && (
        <FailuresInWindow
          failures={failuresInWindow}
          isErrorExplained={lastRunFailure?.failed_at === failuresInWindow.last_failure.at}
        />
      )}

      {task && (
        <>
          <SectionTitle
            title={i18n.translate('xpack.taskManagerUi.flyout.detailsTitle', {
              defaultMessage: 'Task details',
            })}
          />
          <EuiDescriptionList
            type="column"
            compressed
            listItems={getTaskListItems(task)}
            columnWidths={[1, 2]}
          />
        </>
      )}

      <SectionTitle
        title={i18n.translate('xpack.taskManagerUi.flyout.definitionTitle', {
          defaultMessage: 'Task type settings',
        })}
      />
      {definition ? (
        <EuiDescriptionList
          type="column"
          compressed
          listItems={getDefinitionListItems(definition)}
          columnWidths={[1, 2]}
        />
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.taskManagerUi.flyout.noDefinition', {
            defaultMessage: 'This task type is not registered on this Kibana node.',
          })}
        </EuiText>
      )}

      <SectionTitle
        title={i18n.translate('xpack.taskManagerUi.flyout.recentRunsTitle', {
          defaultMessage: 'Recent runs',
        })}
      />
      {detail.event_log_available ? (
        <EuiBasicTable<TaskRun>
          tableCaption={i18n.translate('xpack.taskManagerUi.flyout.recentRunsCaption', {
            defaultMessage: 'Recent runs',
          })}
          items={recentRuns}
          columns={runColumns}
          noItemsMessage={i18n.translate('xpack.taskManagerUi.flyout.noRuns', {
            defaultMessage: 'No runs recorded in the event log for this task.',
          })}
          data-test-subj="taskManagerUiRecentRuns"
        />
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.taskManagerUi.flyout.noEventLog', {
            defaultMessage: 'Run history is unavailable because the event log is not available.',
          })}
        </EuiText>
      )}
    </>
  );
};

export const TaskFlyout: React.FC<{
  taskId: string;
  timeRange: RunsTimeRange;
  onClose: () => void;
}> = ({ taskId, timeRange, onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'taskManagerUiFlyoutTitle' });
  const { data, isLoading, error } = useTaskDetail(taskId, timeRange);

  const renderBody = () => {
    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (error || !data) {
      const isNotFound = getErrorStatusCode(error) === 404;
      return (
        <EuiEmptyPrompt
          iconType={isNotFound ? 'search' : 'warning'}
          color={isNotFound ? 'subdued' : 'danger'}
          title={
            <h3>
              {isNotFound
                ? i18n.translate('xpack.taskManagerUi.flyout.notFound', {
                    defaultMessage: 'Task not found',
                  })
                : i18n.translate('xpack.taskManagerUi.flyout.loadError', {
                    defaultMessage: 'Unable to load the task',
                  })}
            </h3>
          }
          body={
            isNotFound
              ? i18n.translate('xpack.taskManagerUi.flyout.notFoundBody', {
                  defaultMessage:
                    'No task with this ID is stored, and the event log has no runs recorded for it.',
                })
              : getErrorMessage(error)
          }
        />
      );
    }
    return <TaskDetail detail={data} />;
  };

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={titleId}
      size="m"
      ownFocus
      data-test-subj="taskManagerUiTaskFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId} css={{ wordBreak: 'break-all' }}>
            {taskId}
          </h2>
        </EuiTitle>
        {data && (
          <EuiText size="s" color="subdued">
            {data.task_type}
          </EuiText>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
