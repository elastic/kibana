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
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_EVENT_TYPES, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { useKibana } from '../../../hooks/use_kibana';

interface MessageQueueProps {
  queue: readonly string[];
  onRemove: (index: number) => void;
}

const removeLabel = i18n.translate('xpack.agentBuilder.conversationInput.messageQueue.remove', {
  defaultMessage: 'Remove queued message',
});

const moreLabel = (count: number) =>
  i18n.translate('xpack.agentBuilder.conversationInput.messageQueue.more', {
    defaultMessage: '+{count} more queued',
    values: { count },
  });

export const MessageQueue: React.FC<MessageQueueProps> = ({ queue, onRemove }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { analytics },
  } = useKibana();

  if (queue.length === 0) return null;

  const [head, ...rest] = queue;

  const handleRemoveClick = (index: number) => {
    analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.UiClick, {
      ebt_element: AGENT_BUILDER_UI_EBT.element.pageContent,
      ebt_action: AGENT_BUILDER_UI_EBT.action.conversation.MESSAGE_QUEUE_REMOVE,
      element_kind: 'button',
    });
    onRemove(index);
  };

  const containerStyles = css`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: ${euiTheme.size.xs};
    margin-bottom: ${euiTheme.size.l};
  `;

  const bubbleStyles = css`
    max-inline-size: 90%;
    background: ${euiTheme.colors.backgroundBasePlain};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    padding: ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.l};
  `;

  const messageTextStyles = css`
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: ${euiTheme.colors.textParagraph};
  `;

  const moreTextStyles = css`
    color: ${euiTheme.colors.textSubdued};
  `;

  return (
    <div css={containerStyles} data-test-subj="agentBuilderMessageQueue">
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="none"
        css={bubbleStyles}
        data-test-subj="agentBuilderMessageQueueItem"
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" wrap={false} responsive={false}>
          <EuiFlexItem>
            <EuiText size="s" css={messageTextStyles}>
              {head}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={removeLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                size="s"
                color="text"
                aria-label={removeLabel}
                onClick={() => handleRemoveClick(0)}
                data-test-subj="agentBuilderMessageQueueRemove"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {rest.length > 0 && (
        <EuiText size="xs" css={moreTextStyles} data-test-subj="agentBuilderMessageQueueMore">
          {moreLabel(rest.length)}
        </EuiText>
      )}
    </div>
  );
};
