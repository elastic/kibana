/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConversationContextEstimate } from '../../hooks/use_conversation';

const labels = {
  contextSize: i18n.translate('xpack.onechat.conversation.contextSize', {
    defaultMessage: 'Context size',
  }),
  historyTokens: i18n.translate('xpack.onechat.conversation.historyTokens', {
    defaultMessage: 'History',
  }),
  attachmentTokens: i18n.translate('xpack.onechat.conversation.attachmentTokens', {
    defaultMessage: 'Attachments',
  }),
  totalTokens: i18n.translate('xpack.onechat.conversation.totalContextTokens', {
    defaultMessage: 'Total context',
  }),
  tooltipContent: (history: number, attachments: number, total: number) =>
    i18n.translate('xpack.onechat.conversation.contextSizeTooltip', {
      defaultMessage:
        'Estimated tokens for next request:\n• History: ~{history}\n• Attachments: ~{attachments}\n• Total: ~{total}',
      values: {
        history: formatNumber(history),
        attachments: formatNumber(attachments),
        total: formatNumber(total),
      },
    }),
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
};

export const ConversationTokenUsage: React.FC = () => {
  const { historyTokens, attachmentTokens, totalContextTokens, roundCount } =
    useConversationContextEstimate();

  // Don't show if there are no rounds yet
  if (roundCount === 0) {
    return null;
  }

  return (
    <EuiToolTip
      content={labels.tooltipContent(historyTokens, attachmentTokens, totalContextTokens)}
      position="top"
    >
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="tokenNumber" size="s" color="subdued" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            ~{formatNumber(totalContextTokens)} context tokens
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
