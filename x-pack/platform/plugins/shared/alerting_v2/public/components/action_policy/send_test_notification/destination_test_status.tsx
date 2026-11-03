/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import type { ActionPolicyTestSendResult } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import { ExecutionStatus } from '@kbn/workflows';
import React from 'react';
import { useWorkflowExecutionStatus } from '../../../hooks/use_workflow_execution_status';

type TestRunStatus = 'scheduled' | 'running' | 'completed' | 'skipped' | 'failed';

const STATUS_LABELS: Record<TestRunStatus, string> = {
  scheduled: i18n.translate('xpack.alertingV2.actionPolicy.sendTestNotification.status.scheduled', {
    defaultMessage: 'Scheduled',
  }),
  running: i18n.translate('xpack.alertingV2.actionPolicy.sendTestNotification.status.running', {
    defaultMessage: 'Running',
  }),
  completed: i18n.translate('xpack.alertingV2.actionPolicy.sendTestNotification.status.completed', {
    defaultMessage: 'Completed',
  }),
  skipped: i18n.translate('xpack.alertingV2.actionPolicy.sendTestNotification.status.skipped', {
    defaultMessage: 'Skipped',
  }),
  failed: i18n.translate('xpack.alertingV2.actionPolicy.sendTestNotification.status.failed', {
    defaultMessage: 'Failed',
  }),
};

const STATUS_COLORS: Record<TestRunStatus, string> = {
  scheduled: 'hollow',
  running: 'primary',
  completed: 'success',
  skipped: 'warning',
  failed: 'danger',
};

const VIEW_EXECUTION_LABEL = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.viewExecution',
  { defaultMessage: 'View execution' }
);

const STATUS_UNAVAILABLE_LABEL = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.statusUnavailable',
  { defaultMessage: 'Status unavailable' }
);

const toTestRunStatus = (status: ExecutionStatus): TestRunStatus => {
  switch (status) {
    case ExecutionStatus.PENDING:
    case ExecutionStatus.QUEUED:
      return 'scheduled';
    case ExecutionStatus.COMPLETED:
      return 'completed';
    // The run was dropped, for example by the workflow concurrency settings: no step ran.
    case ExecutionStatus.SKIPPED:
      return 'skipped';
    case ExecutionStatus.FAILED:
    case ExecutionStatus.CANCELLED:
    case ExecutionStatus.TIMED_OUT:
      return 'failed';
    default:
      return 'running';
  }
};

const StatusBadge = ({ status }: { status: TestRunStatus }) => (
  <EuiBadge color={STATUS_COLORS[status]} data-test-subj={`sendTestNotificationStatus-${status}`}>
    {STATUS_LABELS[status]}
  </EuiBadge>
);

const ErrorText = ({ message }: { message: string }) => (
  <EuiText size="xs" color="danger" data-test-subj="sendTestNotificationError">
    {message}
  </EuiText>
);

/** Live status of the workflow test run started for one destination. */
export const DestinationTestStatus = ({ result }: { result: ActionPolicyTestSendResult }) => {
  if ('error' in result) {
    return (
      <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <StatusBadge status="failed" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ErrorText message={result.error} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <ExecutionStatusRow
      key={result.workflow_execution_id}
      workflowId={result.workflow_id}
      executionId={result.workflow_execution_id}
    />
  );
};

const ExecutionStatusRow = ({
  workflowId,
  executionId,
}: {
  workflowId: string;
  executionId: string;
}) => {
  const application = useService(CoreStart('application'));
  const { data: execution, isError } = useWorkflowExecutionStatus(executionId);
  const status = execution ? toTestRunStatus(execution.status) : 'scheduled';
  const href = application.getUrlForApp(WORKFLOWS_APP_ID, {
    path: `/${encodeURIComponent(workflowId)}?tab=executions&executionId=${encodeURIComponent(
      executionId
    )}`,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {isError ? (
              <EuiText size="xs" color="subdued">
                {STATUS_UNAVAILABLE_LABEL}
              </EuiText>
            ) : (
              <StatusBadge status={status} />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              href={href}
              target="_blank"
              external
              data-test-subj="sendTestNotificationExecutionLink"
            >
              {VIEW_EXECUTION_LABEL}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {execution?.error?.message && (
        <EuiFlexItem grow={false}>
          <ErrorText message={execution.error.message} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
