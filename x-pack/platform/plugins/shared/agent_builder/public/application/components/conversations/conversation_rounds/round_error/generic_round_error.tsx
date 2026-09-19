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
    lines.push(`Caused by: ${cause.name}: ${cause.message}`);
    cause = cause.cause;
  }
  return lines.join('\n');
};

const labels = {
  description: i18n.translate('xpack.agentBuilder.round.error.generic.description', {
    defaultMessage:
      'An error occurred while processing your request. See the error log below for details.',
  }),
};

interface GenericRoundErrorProps {
  error: unknown;
}
export const GenericRoundError: React.FC<GenericRoundErrorProps> = ({ error }) => {
  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false} data-test-subj="agentBuilderGenericRoundError">
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
