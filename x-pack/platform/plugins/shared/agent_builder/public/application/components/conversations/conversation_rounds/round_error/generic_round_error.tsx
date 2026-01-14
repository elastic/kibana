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

const getStackTrace = (error: unknown) => {
  if (error instanceof Error && typeof error.stack === 'string') {
    return error.stack;
  }

  // Fallback to agentBuilder error formatter
  return formatAgentBuilderErrorMessage(error);
};

const labels = {
  description: i18n.translate('xpack.agentBuilder.round.error.generic.description', {
    defaultMessage:
      'Something in the query caused the model to freeze mid-thought. Performance debugging can be broad - try narrowing your question. See the error log below for specifics.',
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
          {getStackTrace(error)}
        </EuiCodeBlock>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
