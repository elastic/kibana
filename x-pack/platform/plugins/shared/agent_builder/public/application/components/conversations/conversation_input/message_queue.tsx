/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
  euiTextBreakWord,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_EVENT_TYPES, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { useKibana } from '../../../hooks/use_kibana';
import { ROUNDED_BORDER_RADIUS_LARGE, lineClampStyles } from '../../../../common.styles';

interface MessageQueueProps {
  queue: readonly string[];
  onRemove: (index: number) => void;
}

const removeLabel = i18n.translate('xpack.agentBuilder.conversationInput.messageQueue.remove', {
  defaultMessage: 'Remove queued message',
});

export const MessageQueue: React.FC<MessageQueueProps> = ({ queue, onRemove }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { analytics },
  } = useKibana();

  if (queue.length === 0) return null;

  const handleRemoveClick = (index: number) => {
    analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.UiClick, {
      ebt_element: AGENT_BUILDER_UI_EBT.element.pageContent,
      ebt_action: AGENT_BUILDER_UI_EBT.action.conversation.MESSAGE_QUEUE_REMOVE,
      element_kind: 'button',
    });
    onRemove(index);
  };

  const containerStyles = css`
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% + ${euiTheme.size.base});
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: ${euiTheme.size.xs};
    pointer-events: none;
  `;

  // Matches the RoundInput user-bubble shape
  const bubbleStyles = css`
    align-self: flex-end;
    inline-size: fit-content;
    max-inline-size: 90%;
    background: ${euiTheme.colors.backgroundBaseSubdued};
    ${euiTextBreakWord()}
    white-space: pre-wrap;
    border-radius: ${`${ROUNDED_BORDER_RADIUS_LARGE} ${ROUNDED_BORDER_RADIUS_LARGE} 0 ${ROUNDED_BORDER_RADIUS_LARGE}`};
    pointer-events: auto;
  `;

  const messageTextStyles = css`
    ${lineClampStyles(2)}
  `;

  return (
    <div css={containerStyles} data-test-subj="agentBuilderMessageQueue">
      {queue.map((message, index) => (
        <EuiPanel
          key={index}
          css={bubbleStyles}
          paddingSize="m"
          hasShadow={false}
          hasBorder={false}
          aria-label={message}
          data-test-subj="agentBuilderMessageQueueItem"
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" wrap={false} responsive={false}>
            <EuiFlexItem>
              <EuiText size="m" css={messageTextStyles}>
                {message}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={removeLabel} position="right" disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="cross"
                  size="xs"
                  color="text"
                  aria-label={removeLabel}
                  onClick={() => handleRemoveClick(index)}
                  data-test-subj="agentBuilderMessageQueueRemove"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ))}
    </div>
  );
};
