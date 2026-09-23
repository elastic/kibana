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
  isRequestAbortedError,
  isWorkflowAbortedError,
  isWorkflowExecutionError,
} from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup } from '@elastic/eui';
import { ContextExceededExecutionError } from './context_exceeded_execution_error';
import { RequestAbortedExecutionError } from './request_aborted_execution_error';
import { WorkflowError } from './workflow_error';
import { HookError } from './hook_error';
import { GenericExecutionError } from './generic_execution_error';
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
  if (isContextLengthExceededAgentError(error)) return <ContextExceededExecutionError />;
  if (isRequestAbortedError(error)) return <RequestAbortedExecutionError />;
  if (isHooksExecutionError(error)) return <HookError error={error} />;
  if (isWorkflowExecutionError(error)) {
    return (
      <WorkflowError
        title={i18n.translate('xpack.agentBuilder.executionError.workflowExecution.title', {
          defaultMessage: 'Workflow Failed',
        })}
        description={{
          id: 'xpack.agentBuilder.executionError.workflowExecution.description',
          defaultMessage: 'The workflow "{workflow}" execution failed: {message}',
        }}
        error={error}
      />
    );
  }
  if (isWorkflowAbortedError(error)) {
    return (
      <WorkflowError
        title={i18n.translate('xpack.agentBuilder.executionError.workflowAborted.title', {
          defaultMessage: 'Conversation Aborted',
        })}
        description={{
          id: 'xpack.agentBuilder.executionError.workflowAborted.description',
          defaultMessage: 'The workflow "{workflow}" aborted this run: {message}',
        }}
        error={error}
      />
    );
  }

  return <GenericExecutionError error={error} />;
};

interface ExecutionErrorProps {
  error: unknown;
}

export const ExecutionError: React.FC<ExecutionErrorProps> = ({ error }) => {
  const errorContent = renderErrorContent(error);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      responsive={false}
      data-test-subj="agentBuilderExecutionError"
    >
      {isReasoningError(error) ? (
        <ReasoningErrorPanel>{errorContent}</ReasoningErrorPanel>
      ) : (
        errorContent
      )}
    </EuiFlexGroup>
  );
};
