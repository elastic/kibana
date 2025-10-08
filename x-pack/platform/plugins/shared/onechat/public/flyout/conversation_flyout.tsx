/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @jsx jsx */
import { jsx } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFlyoutResizable,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EmbeddableConversationProps } from '../embeddable';
import type { ConversationFlyoutProps } from './types';

interface ConversationFlyoutInternalProps extends ConversationFlyoutProps {
  ConversationComponent: React.ComponentType<EmbeddableConversationProps>;
}

export const ConversationFlyout: React.FC<ConversationFlyoutInternalProps> = ({
  conversationId: initialConversationId,
  agentId,
  additionalContext,
  onConversationCreated,
  onClose,
  ConversationComponent,
}) => {
  const { euiTheme } = useEuiTheme();
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);

  // Handle conversation creation
  const handleConversationCreated = useCallback(
    (id: string) => {
      setConversationId(id);
      onConversationCreated?.(id);
    },
    [onConversationCreated]
  );

  // TODO: Handle additional context by sending an initial message
  // This would require extending the Conversation component to accept an initial message
  useEffect(() => {
    if (additionalContext) {
      // For now, we just log it. In a future iteration, we could:
      // 1. Add an initialMessage prop to EmbeddableConversation
      // 2. Or use a ref to programmatically send a message
      console.log('Additional context provided:', additionalContext);
    }
  }, [additionalContext]);

  const flyoutHeaderStyles = css`
    background-color: ${euiTheme.colors.emptyShade};
    border-bottom: ${euiTheme.border.thin};
  `;

  const flyoutBodyStyles = css`
    padding: 0;
    overflow: hidden;
    .euiFlyoutBody__overflowContent {
      padding: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  `;

  const conversationContainerStyles = css`
    flex: 1;
    overflow: hidden;
  `;

  return (
    <EuiFlyoutResizable
      onClose={onClose}
      aria-labelledby="conversation-flyout-title"
      size="m"
      minWidth={400}
      paddingSize="none"
      ownFocus
      data-test-subj="onechat-conversation-flyout"
    >
      <EuiFlyoutHeader hasBorder css={flyoutHeaderStyles}>
        <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={true}>
            <EuiTitle size="m">
              <h2 id="conversation-flyout-title">
                {conversationId
                  ? i18n.translate('xpack.onechat.flyout.existingConversationTitle', {
                      defaultMessage: 'Conversation',
                    })
                  : i18n.translate('xpack.onechat.flyout.newConversationTitle', {
                      defaultMessage: 'New Conversation',
                    })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              onClick={onClose}
              aria-label={i18n.translate('xpack.onechat.flyout.closeButtonAriaLabel', {
                defaultMessage: 'Close conversation flyout',
              })}
              data-test-subj="onechat-conversation-flyout-close-button"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody css={flyoutBodyStyles}>
        <div css={conversationContainerStyles}>
          <ConversationComponent
            conversationId={conversationId}
            agentId={agentId}
            height="100%"
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};

