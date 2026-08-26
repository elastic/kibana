/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConversationDisplayStatus } from '@kbn/agent-builder-common';

const labels = {
  inProgress: i18n.translate(
    'xpack.agentBuilder.sidebar.conversationList.statusIndicator.inProgress',
    { defaultMessage: 'In progress' }
  ),
  awaitingPrompt: i18n.translate(
    'xpack.agentBuilder.sidebar.conversationList.statusIndicator.awaitingPrompt',
    { defaultMessage: 'Awaiting your input' }
  ),
  error: i18n.translate('xpack.agentBuilder.sidebar.conversationList.statusIndicator.error', {
    defaultMessage: 'Error',
  }),
  unread: i18n.translate('xpack.agentBuilder.sidebar.conversationList.statusIndicator.unread', {
    defaultMessage: 'Unread',
  }),
};

interface ConversationStatusIndicatorProps {
  status: ConversationDisplayStatus;
}

export const ConversationStatusIndicator: React.FC<ConversationStatusIndicatorProps> = ({
  status,
}) => {
  const { euiTheme } = useEuiTheme();

  switch (status) {
    case ConversationDisplayStatus.inProgress:
      return <EuiLoadingSpinner size="m" aria-label={labels.inProgress} />;

    case ConversationDisplayStatus.awaitingPrompt:
      return (
        <EuiIcon
          type="if"
          size="m"
          color={euiTheme.colors.textWarning}
          aria-label={labels.awaitingPrompt}
        />
      );

    case ConversationDisplayStatus.error:
      return <EuiIcon type="warningFill" size="m" color="danger" aria-label={labels.error} />;

    case ConversationDisplayStatus.unread:
      return (
        <EuiIcon type="dot" size="m" color={euiTheme.colors.primary} aria-label={labels.unread} />
      );

    case ConversationDisplayStatus.read:
    default:
      return null;
  }
};
