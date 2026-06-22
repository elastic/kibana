/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ROUNDED_BORDER_RADIUS_LARGE } from '../../../../common.styles';

interface MessageQueueProps {
  queue: string[];
  onRemove: (index: number) => void;
}

const removeLabel = i18n.translate('xpack.agentBuilder.conversationInput.messageQueue.remove', {
  defaultMessage: 'Remove queued message',
});

const moreLabel = (count: number) =>
  i18n.translate('xpack.agentBuilder.conversationInput.messageQueue.more', {
    defaultMessage: '... +{count} more queued',
    values: { count },
  });

/**
 * Renders a pending queued message above the chat input, styled as a user
 * chat bubble. Shows the first message in a dismissible bubble; remaining
 * messages are summarised as "+N more queued".
 */
export const MessageQueue: React.FC<MessageQueueProps> = ({ queue, onRemove }) => {
  const { euiTheme } = useEuiTheme();

  if (queue.length === 0) return null;

  const [first, ...rest] = queue;

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: euiTheme.size.xs,
        marginBottom: 24,
      }}
      data-test-subj="agentBuilderMessageQueue"
    >
      {/* First queued message — white bubble with shadow, × inside */}
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="none"
        css={{
          maxInlineSize: '90%',
          width: '90%',
          background: euiTheme.colors.backgroundBasePlain,
          borderRadius: `${ROUNDED_BORDER_RADIUS_LARGE} ${ROUNDED_BORDER_RADIUS_LARGE} 0 ${ROUNDED_BORDER_RADIUS_LARGE}`,
          border: '1px solid rgb(226, 232, 243)',
          paddingTop: 16,
          paddingBottom: 16,
          paddingLeft: 24,
          paddingRight: 16,
        }}
        data-test-subj="agentBuilderMessageQueueItem"
      >
        <EuiFlexGroup gutterSize="none" alignItems="center" wrap={false} responsive={false} css={{ gap: 10 }}>
          <EuiFlexItem>
            <EuiText
              css={{
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                fontSize: 16,
                fontWeight: 400,
                lineHeight: '24px',
                color: euiTheme.colors.textParagraph,
              }}
            >
              {first}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              size="s"
              color="text"
              aria-label={removeLabel}
              onClick={() => onRemove(0)}
              data-test-subj="agentBuilderMessageQueueRemove"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      {/* Collapsed indicator for remaining messages */}
      {rest.length > 0 && (
        <EuiText
          size="xs"
          css={{ color: euiTheme.colors.textSubdued }}
          data-test-subj="agentBuilderMessageQueueMore"
        >
          {moreLabel(rest.length)}
        </EuiText>
      )}
    </div>
  );
};
