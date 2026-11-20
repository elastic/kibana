/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiLink, EuiText } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { ExecutionStatus } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface WorkflowLastExecutionProps {
  status?: string;
  startedAt?: string;
  href?: string;
  emptyMessage?: string;
  'data-test-subj'?: string;
}

const workflowExecutionStatusIcon = (
  status: string
): { type: string; color: 'success' | 'danger' | 'subdued'; label: string } | undefined => {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return {
        type: 'checkCircleFill',
        color: 'success',
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.status.completed', {
          defaultMessage: 'Succeeded',
        }),
      };
    case ExecutionStatus.FAILED:
      return {
        type: 'errorFill',
        color: 'danger',
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.status.failed', {
          defaultMessage: 'Failed',
        }),
      };
    case ExecutionStatus.TIMED_OUT:
      return {
        type: 'errorFill',
        color: 'danger',
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.status.timedOut', {
          defaultMessage: 'Timed out',
        }),
      };
    case ExecutionStatus.CANCELLED:
      return {
        type: 'minusCircle',
        color: 'subdued',
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.status.cancelled', {
          defaultMessage: 'Cancelled',
        }),
      };
    case ExecutionStatus.SKIPPED:
      return {
        type: 'minusCircle',
        color: 'subdued',
        label: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.status.skipped', {
          defaultMessage: 'Skipped',
        }),
      };
    default:
      return undefined;
  }
};

const neverRunLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.automations.neverRun', {
  defaultMessage: 'Never run',
});

/** Last workflow run time and terminal status, optionally linked to the execution. */
export const WorkflowLastExecution = ({
  status,
  startedAt,
  href,
  emptyMessage,
  'data-test-subj': testSubj = 'contextWorkflowLastExecution',
}: WorkflowLastExecutionProps) => {
  if (startedAt === undefined && status === undefined) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj={testSubj}>
        {emptyMessage ?? neverRunLabel}
      </EuiText>
    );
  }

  const icon = status !== undefined ? workflowExecutionStatusIcon(status) : undefined;
  const when = startedAt ? <FormattedRelative value={new Date(startedAt)} /> : icon?.label;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} data-test-subj={testSubj}>
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
