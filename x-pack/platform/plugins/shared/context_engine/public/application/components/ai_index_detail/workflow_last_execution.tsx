/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiText,
  type IconType,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  ExecutionStatus,
  ExecutionStatusValues,
  isTerminalStatus,
  type ExecutionStatusUnion,
} from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface WorkflowExecutionStatusDisplay {
  type: IconType;
  color: 'success' | 'danger' | 'subdued';
  label: string;
}

interface WorkflowLastExecutionBaseProps {
  href?: string;
  emptyMessage?: string;
  label?: string;
  'data-test-subj'?: string;
}

export type WorkflowLastExecutionProps = WorkflowLastExecutionBaseProps &
  (
    | { hasExecution: false; status?: never; startedAt?: never }
    | { hasExecution: true; status: ExecutionStatusUnion; startedAt?: string }
    | { hasExecution?: never; status?: ExecutionStatusUnion; startedAt?: string }
  );

const neverRunLabel = i18n.translate('xpack.contextEngine.workflowLastExecution.neverRun', {
  defaultMessage: 'Never run',
});

export const getWorkflowExecutionStatusIcon = (
  status: ExecutionStatusUnion
): WorkflowExecutionStatusDisplay | undefined => {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return {
        type: 'checkCircleFill',
        color: 'success',
        label: i18n.translate('xpack.contextEngine.workflowLastExecution.status.completed', {
          defaultMessage: 'Succeeded',
        }),
      };
    case ExecutionStatus.FAILED:
      return {
        type: 'errorFill',
        color: 'danger',
        label: i18n.translate('xpack.contextEngine.workflowLastExecution.status.failed', {
          defaultMessage: 'Failed',
        }),
      };
    case ExecutionStatus.TIMED_OUT:
      return {
        type: 'errorFill',
        color: 'danger',
        label: i18n.translate('xpack.contextEngine.workflowLastExecution.status.timedOut', {
          defaultMessage: 'Timed out',
        }),
      };
    case ExecutionStatus.CANCELLED:
      return {
        type: 'minusCircle',
        color: 'subdued',
        label: i18n.translate('xpack.contextEngine.workflowLastExecution.status.cancelled', {
          defaultMessage: 'Cancelled',
        }),
      };
    case ExecutionStatus.SKIPPED:
      return {
        type: 'minusCircle',
        color: 'subdued',
        label: i18n.translate('xpack.contextEngine.workflowLastExecution.status.skipped', {
          defaultMessage: 'Skipped',
        }),
      };
    default:
      return undefined;
  }
};

const inProgressStatusDisplay = (): WorkflowExecutionStatusDisplay => ({
  type: 'clock',
  color: 'subdued',
  label: i18n.translate('xpack.contextEngine.workflowLastExecution.status.inProgress', {
    defaultMessage: 'In progress',
  }),
});

const isNonTerminal = (status: ExecutionStatusUnion): boolean => {
  const parsed = ExecutionStatusValues.find((value) => value === status);
  return parsed !== undefined && !isTerminalStatus(parsed);
};

/** Icon, color, and label for a workflow execution status, including non-terminal runs. */
export const getWorkflowExecutionStatusDisplay = (
  status: ExecutionStatusUnion
): WorkflowExecutionStatusDisplay | undefined => {
  const terminal = getWorkflowExecutionStatusIcon(status);
  if (terminal) {
    return terminal;
  }
  if (isNonTerminal(status)) {
    return inProgressStatusDisplay();
  }
  return undefined;
};

/** Lower rank is worse (failed/timed out are 0). */
export const getWorkflowExecutionStatusWorstRank = (status: ExecutionStatusUnion): number => {
  if (status === ExecutionStatus.FAILED || status === ExecutionStatus.TIMED_OUT) {
    return 0;
  }
  if (status === ExecutionStatus.CANCELLED) {
    return 1;
  }
  if (status === ExecutionStatus.SKIPPED) {
    return 2;
  }
  if (isNonTerminal(status)) {
    return 3;
  }
  return 4;
};

const hasNoExecution = (
  props: WorkflowLastExecutionProps
): props is WorkflowLastExecutionBaseProps & { hasExecution: false } =>
  'hasExecution' in props && props.hasExecution === false;

/** Last workflow run time and terminal status, optionally linked to the execution. */
export const WorkflowLastExecution = (props: WorkflowLastExecutionProps) => {
  const {
    href,
    emptyMessage,
    label,
    'data-test-subj': testSubj = 'contextWorkflowLastExecution',
  } = props;

  if (hasNoExecution(props)) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj={testSubj}>
        {emptyMessage ?? neverRunLabel}
      </EuiText>
    );
  }

  const { status, startedAt } = props;
  if (status === undefined && startedAt === undefined) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj={testSubj}>
        {emptyMessage ?? neverRunLabel}
      </EuiText>
    );
  }

  const icon = status !== undefined ? getWorkflowExecutionStatusIcon(status) : undefined;
  const when = startedAt ? <FormattedRelative value={new Date(startedAt)} /> : icon?.label;

  if (when === undefined) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} data-test-subj={testSubj}>
      {label ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {label}
          </EuiText>
        </EuiFlexItem>
      ) : null}
      {icon ? (
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type={icon.type}
            color={icon.color}
            size="s"
            content={icon.label}
            aria-label={icon.label}
            iconProps={{
              ...(status !== undefined
                ? {
                    'data-test-subj': `${testSubj}Status-${status}`,
                  }
                : {}),
            }}
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" className="eui-textTruncate">
          {href ? (
            <EuiLink href={href} color="text" data-test-subj="contextWorkflowLastExecutionLink">
              {when}
            </EuiLink>
          ) : (
            when
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
