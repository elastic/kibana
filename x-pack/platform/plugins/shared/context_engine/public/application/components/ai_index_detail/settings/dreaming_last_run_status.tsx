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
  WorkflowLastExecution,
} from '../workflow_last_execution';
import { getWorstExecution } from './dreaming_workflow_execution_utils';

const lastRunLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.runs.lastRun', {
  defaultMessage: 'Last run',
});

const popoverAriaLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.runs.popoverAriaLabel',
  {
    defaultMessage: 'Show last run time and status for all dreaming workflows',
  }
);

const neverRunRowLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.runs.neverRun',
  {
    defaultMessage: 'Never run',
  }
);

const statusUnavailableRowLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.runs.statusUnavailable',
  {
    defaultMessage: 'Status unavailable',
  }
);

export interface DreamingLastRunStatusProps {
  workflowIds: readonly string[];
  executions: readonly WorkflowLatestExecution[] | undefined;
  unavailableWorkflowIds: readonly string[];
}

interface DreamingLastRunExecutionRowProps {
  name: string;
  execution: WorkflowExecutionListItemDto | undefined;
  href: string | undefined;
  isUnavailable: boolean;
}

const getRowStatusLabel = (
  statusDisplay: ReturnType<typeof getWorkflowExecutionStatusDisplay> | undefined,
  isUnavailable: boolean
): string => {
  if (statusDisplay) {
    return statusDisplay.label;
  }
  if (isUnavailable) {
    return statusUnavailableRowLabel;
  }
  return neverRunRowLabel;
};

const DreamingLastRunExecutionRow = ({
  name,
  execution,
  href,
  isUnavailable,
}: DreamingLastRunExecutionRowProps) => {
  const statusDisplay = execution ? getWorkflowExecutionStatusDisplay(execution.status) : undefined;
  const statusLabel = getRowStatusLabel(statusDisplay, isUnavailable);

  const nameContent =
    href !== undefined ? (
      <EuiLink href={href} data-test-subj="contextAiIndexDreamingLastRunPopoverRowLink">
        <strong>{name}</strong>
      </EuiLink>
    ) : (
      <strong>{name}</strong>
    );

  return (
    <EuiListGroupItem
      wrapText
      data-test-subj="contextAiIndexDreamingLastRunPopoverRow"
      label={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
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
            <EuiText size="xs">{nameContent}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {statusLabel}
            </EuiText>
          </EuiFlexItem>
          {execution?.startedAt ? (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedRelative value={new Date(execution.startedAt)} />
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      }
    />
  );
};

export const DreamingLastRunStatus = ({
  workflowIds,
  executions,
  unavailableWorkflowIds,
}: DreamingLastRunStatusProps) => {
  const { summaries } = useWorkflowSummaries(workflowIds);
  const {
    services: { application },
  } = useKibana();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const executionByWorkflowId = useMemo(() => {
    const byId = new Map<string, WorkflowExecutionListItemDto>();
    for (const item of executions ?? []) {
      byId.set(item.workflowId, item.execution);
    }
    return byId;
  }, [executions]);

  if (executions === undefined) {
    return null;
  }

  if (executions.length === 0) {
    return (
      <WorkflowLastExecution hasExecution={false} data-test-subj="contextAiIndexDreamingLastRun" />
    );
  }

  const worst = getWorstExecution(executions);
  if (worst === undefined) {
    return null;
  }

  const worstStatusDisplay = getWorkflowExecutionStatusDisplay(worst.execution.status);
  const worstStartedAt = worst.execution.startedAt;
  const hasWorstStartedAt = worstStartedAt !== undefined && worstStartedAt !== '';

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
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          anchorPosition="upCenter"
          hasArrow
          aria-label={popoverAriaLabel}
          button={
            <EuiButtonEmpty
              size="xs"
              color="text"
              data-test-subj="contextAiIndexDreamingLastRunPopoverButton"
              onClick={() => setIsPopoverOpen((open) => !open)}
            >
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type={worstStatusDisplay.type}
                    color={worstStatusDisplay.color}
                    size="s"
                    data-test-subj={`contextAiIndexDreamingLastRunStatus-${worst.execution.status}`}
                    aria-hidden={true}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {worstStatusDisplay.label}
                  </EuiText>
                </EuiFlexItem>
                {hasWorstStartedAt ? (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued" className="eui-textTruncate">
                      <FormattedRelative value={new Date(worstStartedAt)} />
                    </EuiText>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </EuiButtonEmpty>
          }
        >
          <EuiListGroup>
            {workflowIds.map((workflowId) => {
              const execution = executionByWorkflowId.get(workflowId);
              const href =
                execution !== undefined
                  ? application.getUrlForApp(WORKFLOWS_APP_ID, {
                      path: getWorkflowExecutionPath(workflowId, execution.id),
                    })
                  : undefined;
              const isUnavailable =
                execution === undefined && unavailableWorkflowIds.includes(workflowId);

              return (
                <DreamingLastRunExecutionRow
                  key={workflowId}
                  name={summaries.get(workflowId)?.name ?? workflowId}
                  execution={execution}
                  href={href}
                  isUnavailable={isUnavailable}
                />
              );
            })}
          </EuiListGroup>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
