/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiCodeBlock, EuiSplitPanel } from '@elastic/eui';
import React from 'react';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { i18n } from '@kbn/i18n';

// The message followed by the cause chain, innermost last. Errors here are rebuilt from the
// persisted event, so a stack trace would only point at the deserializer.
const getErrorDetails = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return formatAgentBuilderErrorMessage(error);
  }
  const lines = [error.message];
  let cause: unknown = error.cause;
  while (cause instanceof Error) {
    lines.push(
      i18n.translate('xpack.agentBuilder.executionError.generic.causedBy', {
        defaultMessage: 'Caused by: {name}: {message}',
        values: { name: cause.name, message: cause.message },
      })
    );
    cause = cause.cause;
  }
  return lines.join('\n');
};

const labels = {
  description: i18n.translate('xpack.agentBuilder.executionError.generic.description', {
    defaultMessage:
      'An error occurred while processing your request. See the error log below for details.',
  }),
};

interface GenericExecutionErrorProps {
  error: unknown;
}
export const GenericExecutionError: React.FC<GenericExecutionErrorProps> = ({ error }) => {
  return (
    <EuiSplitPanel.Outer
      hasBorder
      hasShadow={false}
      data-test-subj="agentBuilderGenericExecutionError"
    >
      <EuiSplitPanel.Inner color="danger" grow={false} paddingSize="m">
        <EuiText size="s" color="danger">
          <strong>{labels.description}</strong>
        </EuiText>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="none">
        <EuiCodeBlock language="text" isCopyable paddingSize="m" lineNumbers overflowHeight={500}>
          {getErrorDetails(error)}
        </EuiCodeBlock>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
