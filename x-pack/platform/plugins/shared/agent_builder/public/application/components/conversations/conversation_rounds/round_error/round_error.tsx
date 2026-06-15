/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  isContextLengthExceededAgentError,
  isHooksExecutionError,
  isWorkflowAbortedError,
  isWorkflowExecutionError,
} from '@kbn/agent-builder-common';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { ContextExceededRoundError } from './context_exceeded_round_error';
import { WorkflowError } from './workflow_error';
import { HookError } from './hook_error';
import { GenericRoundError } from './generic_round_error';
import { ReasoningErrorPanel } from './reasoning_error_panel';

/**
 * Returns `true` when the error should be rendered inside the generic
 * `ReasoningErrorPanel` wrapper. Specialized error types (workflow, hook)
 * have their own self-contained UI and skip the wrapper.
 */
const isReasoningError = (error: unknown): boolean => {
  return (
    !isWorkflowAbortedError(error) &&
    !isWorkflowExecutionError(error) &&
    !isHooksExecutionError(error)
  );
};

const renderErrorContent = (error: unknown): React.ReactNode => {
  if (isContextLengthExceededAgentError(error)) return <ContextExceededRoundError />;
  if (isHooksExecutionError(error)) return <HookError error={error} />;
  if (isWorkflowExecutionError(error)) {
    return (
      <WorkflowError
        title={i18n.translate('xpack.agentBuilder.round.error.workflowExecution.title', {
          defaultMessage: 'Workflow Failed',
        })}
        description={{
          id: 'xpack.agentBuilder.round.error.workflowExecution.description',
          defaultMessage: 'The workflow "{workflow}" execution failed: {message}',
        }}
        error={error}
      />
    );
  }
  if (isWorkflowAbortedError(error)) {
    return (
      <WorkflowError
        title={i18n.translate('xpack.agentBuilder.round.error.workflowAborted.title', {
          defaultMessage: 'Conversation Aborted',
        })}
        description={{
          id: 'xpack.agentBuilder.round.error.workflowAborted.description',
          defaultMessage: 'The workflow "{workflow}" aborted this run: {message}',
        }}
        error={error}
      />
    );
  }

  return <GenericRoundError error={error} />;
};

interface RoundErrorProps {
  error: unknown;
  onRetry: () => void;
}

const labels = {
  retryAriaLabel: i18n.translate('xpack.agentBuilder.round.error.retryLabel', {
    defaultMessage: 'Retry',
  }),
  tryAgain: i18n.translate('xpack.agentBuilder.round.error.tryAgain', {
    defaultMessage: 'Try again?',
  }),
};

export const RoundError: React.FC<RoundErrorProps> = ({ error, onRetry }) => {
  const { euiTheme } = useEuiTheme();

  const errorContent = renderErrorContent(error);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      responsive={false}
      data-test-subj="agentBuilderRoundError"
    >
      {isReasoningError(error) ? (
        <ReasoningErrorPanel>{errorContent}</ReasoningErrorPanel>
      ) : (
        errorContent
      )}

      <EuiFlexGroup direction="row" justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            css={css`
              color: ${euiTheme.colors.textPrimary};
            `}
            data-test-subj="agentBuilderRoundErrorRetryButton"
            iconType="refresh"
            onClick={onRetry}
            aria-label={labels.retryAriaLabel}
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.conversation.RETRY,
              detail: 'conversation',
            })}
          >
            {labels.tryAgain}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
