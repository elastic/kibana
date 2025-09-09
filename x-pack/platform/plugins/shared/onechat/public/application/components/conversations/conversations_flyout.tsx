/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import useEvent from 'react-use/lib/useEvent';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';
import { OnechatConversationsView } from './conversations_view';
import { useConversationList } from '../../hooks/use_conversation_list';
import { useSpaceId } from '../../hooks/use_space_id';
import { SendMessageProvider } from '../../context/send_message_context';
import { OnechatSpaceIdProvider } from '../../hooks/use_space_aware_context';
import { ConversationSidebar } from './conversation_sidebar/conversation_sidebar';
import { ConversationHeader } from './conversation_header';
import { Conversation } from './conversation';

export const CONVERSATION_SIDE_PANEL_WIDTH = 220;

const ConversationsContainer = styled('span')`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

export interface ConversationsFlyoutProps {
  isVisible: boolean;
  onClose: () => void;
  handleShortcutPress: () => void;
}
const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

export const ConversationsFlyout: React.FC<ConversationsFlyoutProps> = ({
  isVisible,
  onClose,
  handleShortcutPress,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const spaceId = useSpaceId();
  const { euiTheme } = useEuiTheme();
  const flyoutRef = useRef<HTMLDivElement>();
  // Register keyboard listener to show the modal when cmd + ; is pressed
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === ';' && (isMac ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
        handleShortcutPress();
      }
    },
    [handleShortcutPress]
  );
  useEvent('keydown', onKeyDown);
  const mainStyles = css`
    border: none;
  `;
  const backgroundStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;
  const sidebarStyles = css`
    ${backgroundStyles}
    padding: ${euiTheme.size.base};
    max-block-size: calc(var(--kbn-application--content-height));
  `;
  const headerHeight = `calc(${euiTheme.size.xl} * 2)`;
  const headerStyles = css`
    ${backgroundStyles}
    display: flex;
    flex-direction: column;
    justify-content: center;
    border: none;
    block-size: ${headerHeight};
  `;
  const contentStyles = css`
    ${backgroundStyles}
    width: 100%;
    height: 100%;
    max-block-size: calc(var(--kbn-application--content-height) - ${headerHeight});
  `;

  const labels = {
    header: i18n.translate('xpack.onechat.conversationsView.header', {
      defaultMessage: 'Conversation header',
    }),
    content: i18n.translate('xpack.onechat.conversationsView.content', {
      defaultMessage: 'Conversation content',
    }),
  };

  const { conversations = [], isLoading } = useConversationList();

  if (!isVisible || !OnechatConversationsView) return null;

  return (
    <EuiFlyoutResizable
      ref={flyoutRef}
      css={css`
        max-inline-size: calc(100% - 20px);
        min-inline-size: 400px;
        > div {
          height: 100%;
        }
      `}
      onClose={onClose}
      data-test-subj="onechat-flyout"
      paddingSize="none"
      hideCloseButton
      aria-label="One Chat Assistant"
    >
      <OnechatSpaceIdProvider spaceId={spaceId}>
        <SendMessageProvider>
          <EuiFlexGroup direction={'row'} wrap={false} gutterSize="none">
            {isSidebarOpen && (
              <EuiFlexItem
                grow={false}
                css={css`
                  inline-size: ${CONVERSATION_SIDE_PANEL_WIDTH}px;
                  border-right: ${euiTheme.border.thin};
                  padding: ${euiTheme.size.base};
                `}
              >
                <ConversationSidebar conversations={conversations} isLoading={isLoading} />
              </EuiFlexItem>
            )}
            <EuiFlexItem
              css={css`
                overflow: hidden;
              `}
            >
              <ConversationsContainer data-test-subj="oneChat">
                <EuiFlexGroup
                  css={css`
                    overflow: hidden;
                  `}
                >
                  <EuiFlexItem
                    css={css`
                      max-width: 100%;
                    `}
                  >
                    <EuiFlyoutHeader hasBorder>
                      <EuiPanel
                        hasShadow={false}
                        paddingSize="m"
                        css={css`
                          padding-top: ${euiTheme.size.s};
                          padding-bottom: ${euiTheme.size.s};
                        `}
                      >
                        <ConversationHeader
                          isSidebarOpen={isSidebarOpen}
                          onToggleSidebar={() => {
                            setIsSidebarOpen((open) => !open);
                          }}
                        />
                      </EuiPanel>
                    </EuiFlyoutHeader>
                    <EuiFlyoutBody
                      css={css`
                        min-height: 100px;
                        flex: 1;

                        > div {
                          display: flex;
                          flex-direction: column;
                          align-items: stretch;

                          > .euiFlyoutBody__banner {
                            overflow-x: unset;
                          }

                          > .euiFlyoutBody__overflowContent {
                            display: flex;
                            flex: 1;
                            overflow: auto;
                          }
                        }
                      `}
                    >
                      <Conversation />
                    </EuiFlyoutBody>
                    <EuiFlyoutFooter
                      css={css`
                        background: none;
                        border-top: ${euiTheme.border.thin};
                        overflow: hidden;
                        max-height: 60%;
                        display: flex;
                        flex-direction: column;
                      `}
                    >
                      {' '}
                    </EuiFlyoutFooter>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </ConversationsContainer>
            </EuiFlexItem>
          </EuiFlexGroup>
        </SendMessageProvider>
      </OnechatSpaceIdProvider>
    </EuiFlyoutResizable>
  );
};

ConversationsFlyout.displayName = 'ConversationsFlyout';
