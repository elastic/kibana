/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip, EuiLoadingSpinner, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConversationDisplayStatus } from '@kbn/agent-builder-common';

const labels = {
  inProgress: i18n.translate(
    'xpack.agentBuilder.sidebar.conversationList.statusIndicator.inProgress',
    { defaultMessage: 'Working' }
  ),
  awaitingPrompt: i18n.translate(
    'xpack.agentBuilder.sidebar.conversationList.statusIndicator.awaitingPrompt',
    { defaultMessage: 'Waiting for input' }
  ),
  error: i18n.translate('xpack.agentBuilder.sidebar.conversationList.statusIndicator.error', {
    defaultMessage: 'Error',
  }),
  unread: i18n.translate('xpack.agentBuilder.sidebar.conversationList.statusIndicator.unread', {
    defaultMessage: 'New',
  }),
};

interface ConversationStatusIndicatorProps {
  status: ConversationDisplayStatus;
}

const iconProps = { tabIndex: -1 };

export const ConversationStatusIndicator: React.FC<ConversationStatusIndicatorProps> = ({
  status,
}) => {
  const { euiTheme } = useEuiTheme();

  switch (status) {
    case ConversationDisplayStatus.inProgress:
      return (
        <EuiToolTip content={labels.inProgress} disableScreenReaderOutput>
          <EuiLoadingSpinner size="m" aria-label={labels.inProgress} />
        </EuiToolTip>
      );

    case ConversationDisplayStatus.awaitingPrompt:
      return (
        <EuiIconTip
          type="pause"
          color={euiTheme.colors.textWarning}
          content={labels.awaitingPrompt}
          aria-label={labels.awaitingPrompt}
          iconProps={iconProps}
          disableScreenReaderOutput
        />
      );

    case ConversationDisplayStatus.error:
      return (
        <EuiIconTip
          type="warning"
          color="danger"
          content={labels.error}
          aria-label={labels.error}
          iconProps={iconProps}
          disableScreenReaderOutput
        />
      );

    case ConversationDisplayStatus.unread:
      return (
        <EuiIconTip
          type="dot"
          color={euiTheme.colors.vis.euiColorVis2}
          content={labels.unread}
          aria-label={labels.unread}
          iconProps={iconProps}
          disableScreenReaderOutput
        />
      );

    case ConversationDisplayStatus.read:
    default:
      return null;
  }
};
