/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type {
  AgentBuilderAgentExecutionError,
  AgentExecutionErrorCode,
} from '@kbn/agent-builder-common';

const labels = {
  forbidden: i18n.translate('xpack.agentBuilder.round.error.connector.forbidden', {
    defaultMessage:
      'The model provider rejected this request as unauthorized. Your organization may not be entitled to use this model. Contact your administrator to check your subscription, or select a different model.',
  }),
  unauthorized: i18n.translate('xpack.agentBuilder.round.error.connector.unauthorized', {
    defaultMessage:
      'The model provider rejected the credentials for this connector. Verify the connector configuration, or select a different model.',
  }),
  rateLimited: i18n.translate('xpack.agentBuilder.round.error.connector.rateLimited', {
    defaultMessage:
      'The model provider is rate limiting this request. Wait a moment before trying again, or select a different model.',
  }),
  serverError: i18n.translate('xpack.agentBuilder.round.error.connector.serverError', {
    defaultMessage:
      'The model provider is currently unavailable. Try again in a moment, or select a different model.',
  }),
  generic: i18n.translate('xpack.agentBuilder.round.error.connector.generic', {
    defaultMessage: 'The model provider returned an error for this request.',
  }),
};

const getDescription = (statusCode: number): string => {
  switch (statusCode) {
    case 401:
      return labels.unauthorized;
    case 403:
      return labels.forbidden;
    case 429:
      return labels.rateLimited;
    default:
      return statusCode >= 500 ? labels.serverError : labels.generic;
  }
};

interface ConnectorRoundErrorProps {
  error: AgentBuilderAgentExecutionError<AgentExecutionErrorCode.connectorError>;
}

export const ConnectorRoundError: React.FC<ConnectorRoundErrorProps> = ({ error }) => {
  const { statusCode } = error.meta;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj="agentBuilderRoundErrorConnector"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <p>{getDescription(statusCode)}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCodeBlock language="text" isCopyable paddingSize="m" overflowHeight={200}>
          {error.message}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
