/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import React, { useMemo, useState } from 'react';
import type { WorkflowLatestExecution } from '../../../hooks/use_latest_workflow_execution';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowSummaries } from '../../../hooks/use_workflow_summaries';
import { getWorkflowExecutionPath } from '../../../utils/get_workflow_execution_path';
import {
  getWorkflowExecutionStatusDisplay,
  getWorkflowExecutionStatusIcon,
  WorkflowLastExecution,
} from '../workflow_last_execution';
import { getWorstExecutionStatus } from './dreaming_workflow_execution_utils';

const lastRunLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.runs.lastRun', {
  defaultMessage: 'Last run',
});

const popoverAriaLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.runs.popoverAriaLabel',
  {
    defaultMessage: 'Show last run time and status for all dreaming workflows',
  }
);

export interface DreamingLastRunStatusProps {
  workflowIds: readonly string[];
  executions: readonly WorkflowLatestExecution[];
  execution: Pick<WorkflowExecutionListItemDto, 'id' | 'status' | 'startedAt'> | null | undefined;
}

type GetUrlForApp = (appId: string, options?: { path?: string }) => string;

const executionLinkHref = (
  getUrlForApp: GetUrlForApp,
  workflowId: string,
  executionId: string
): string =>
  getUrlForApp(WORKFLOWS_APP_ID, {
    path: getWorkflowExecutionPath(workflowId, executionId),
  });

const DreamingLastRunExecutionRow = ({
  item,
  name,
  getUrlForApp,
}: {
  item: WorkflowLatestExecution;
  name: string;
  getUrlForApp: GetUrlForApp;
}) => {
  const statusDisplay = getWorkflowExecutionStatusDisplay(item.execution.status);
  const rowHref = executionLinkHref(getUrlForApp, item.workflowId, item.execution.id);

  return (
    <EuiListGroupItem
      data-test-subj="contextAiIndexDreamingLastRunPopoverRow"
      label={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
          {statusDisplay ? (
            <EuiFlexItem grow={false}>
              <EuiIcon
                type={statusDisplay.type}
                color={statusDisplay.color}
                size="s"
                aria-hidden={true}
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{name}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {statusDisplay?.label ?? ''}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink href={rowHref} data-test-subj="contextWorkflowLastExecutionLink">
              {item.execution.startedAt ? (
                <FormattedRelative value={new Date(item.execution.startedAt)} />
              ) : (
                statusDisplay?.label
              )}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};

export const DreamingLastRunStatus = ({
  workflowIds,
  executions,
  execution,
}: DreamingLastRunStatusProps) => {
  const workflowIdsList = useMemo(() => [...workflowIds], [workflowIds]);
  const { summaries } = useWorkflowSummaries(workflowIdsList);
  const {
    services: { application },
  } = useKibana();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (workflowIds.length === 0) {
    return null;
  }

  if (execution === undefined) {
    return null;
  }

  if (execution === null) {
    return (
      <WorkflowLastExecution hasExecution={false} data-test-subj="contextAiIndexDreamingLastRun" />
    );
  }

  const { status, startedAt } = execution;
  const terminalStatusIcon = getWorkflowExecutionStatusIcon(status);
  const when = startedAt ? (
    <FormattedRelative value={new Date(startedAt)} />
  ) : (
    terminalStatusIcon?.label
  );

  if (when === undefined) {
    return null;
  }

  const worst = getWorstExecutionStatus(executions);
  const worstStatusDisplay = worst
    ? getWorkflowExecutionStatusDisplay(worst.execution.status)
    : terminalStatusIcon;

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      data-test-subj="contextAiIndexDreamingLastRun"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {lastRunLabel}
        </EuiText>
      </EuiFlexItem>
      {worstStatusDisplay ? (
        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
            anchorPosition="upCenter"
            aria-label={popoverAriaLabel}
            button={
              <EuiButtonEmpty
                size="xs"
                color="text"
                aria-label={popoverAriaLabel}
                data-test-subj="contextAiIndexDreamingLastRunPopoverButton"
                onClick={() => setIsPopoverOpen((open) => !open)}
              >
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type={worstStatusDisplay.type}
                      color={worstStatusDisplay.color}
                      size="s"
                      data-test-subj={`contextAiIndexDreamingLastRunStatus-${
                        worst?.execution.status ?? status
                      }`}
                      aria-hidden={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {worstStatusDisplay.label}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued" className="eui-textTruncate">
                      {when}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiButtonEmpty>
            }
          >
            <EuiListGroup>
              {executions.map((item) => (
                <DreamingLastRunExecutionRow
                  key={item.workflowId}
                  item={item}
                  name={summaries.get(item.workflowId)?.name ?? item.workflowId}
                  getUrlForApp={application.getUrlForApp}
                />
              ))}
            </EuiListGroup>
          </EuiPopover>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
