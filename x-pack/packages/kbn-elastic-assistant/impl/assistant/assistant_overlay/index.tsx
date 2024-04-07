/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiModal, EuiFlyoutResizable, useEuiTheme } from '@elastic/eui';

import useEvent from 'react-use/lib/useEvent';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';
import { css } from '@emotion/react';
import {
  ShowAssistantOverlayProps,
  useAssistantContext,
  UserAvatar,
} from '../../assistant_context';
import { Assistant, CONVERSATION_SIDE_PANEL_WIDTH } from '..';
import { WELCOME_CONVERSATION_TITLE } from '../use_conversation/translations';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

const StyledEuiModal = styled(EuiModal)`
  ${({ theme }) => `margin-top: ${theme.eui.euiSizeXXL};`}
  min-width: 95vw;
  min-height: 25vh;
`;

/**
 * Modal container for Elastic AI Assistant conversations, receiving the page contents as context, plus whatever
 * component currently has focus and any specific context it may provide through the SAssInterface.
 */
export interface Props {
  isFlyoutMode: boolean;
  currentUserAvatar?: UserAvatar;
}

export const AssistantOverlay = React.memo<Props>(({ isFlyoutMode, currentUserAvatar }) => {
  const { euiTheme } = useEuiTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [conversationTitle, setConversationTitle] = useState<string | undefined>(
    WELCOME_CONVERSATION_TITLE
  );
  const [promptContextId, setPromptContextId] = useState<string | undefined>();
  const { assistantTelemetry, setShowAssistantOverlay, getLastConversationTitle } =
    useAssistantContext();

  const [chatHistoryVisible, setChatHistoryVisible] = useState(false);

  // Bind `showAssistantOverlay` in SecurityAssistantContext to this modal instance
  const showOverlay = useCallback(
    () =>
      ({
        showOverlay: so,
        promptContextId: pid,
        conversationTitle: cTitle,
      }: ShowAssistantOverlayProps) => {
        const newConversationTitle = getLastConversationTitle(cTitle);
        if (so)
          assistantTelemetry?.reportAssistantInvoked({
            conversationId: newConversationTitle,
            invokedBy: 'click',
          });

        setIsModalVisible(so);
        setPromptContextId(pid);
        setConversationTitle(newConversationTitle);
      },
    [assistantTelemetry, getLastConversationTitle]
  );
  useEffect(() => {
    setShowAssistantOverlay(showOverlay);
  }, [setShowAssistantOverlay, showOverlay]);

  // Called whenever platform specific shortcut for assistant is pressed
  const handleShortcutPress = useCallback(() => {
    // Try to restore the last conversation on shortcut pressed
    if (!isModalVisible) {
      setConversationTitle(getLastConversationTitle());
      assistantTelemetry?.reportAssistantInvoked({
        invokedBy: 'shortcut',
        conversationId: getLastConversationTitle(),
      });
    }

    setIsModalVisible(!isModalVisible);
  }, [isModalVisible, getLastConversationTitle, assistantTelemetry]);

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

  // Modal control functions
  const cleanupAndCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setPromptContextId(undefined);
    setConversationTitle(conversationTitle);
  }, [conversationTitle]);

  const handleCloseModal = useCallback(() => {
    cleanupAndCloseModal();
  }, [cleanupAndCloseModal]);

  const toggleChatHistory = useCallback(() => {
    setChatHistoryVisible((prev) => {
      if (flyoutRef?.current) {
        const currentValue = parseInt(flyoutRef.current.style.inlineSize.split('px')[0], 10);
        flyoutRef.current.style.inlineSize = `${
          prev
            ? currentValue - CONVERSATION_SIDE_PANEL_WIDTH
            : currentValue + CONVERSATION_SIDE_PANEL_WIDTH
        }px`;
      }

      return !prev;
    });
  }, []);

  const flyoutRef = useRef<HTMLDivElement>();

  if (!isModalVisible) return null;

  if (isFlyoutMode) {
    return (
      <EuiFlyoutResizable
        ref={flyoutRef}
        css={css`
          max-inline-size: calc(100% - 20px);
          > div {
            height: 100%;
          }
        `}
        onClose={handleCloseModal}
        data-test-subj="ai-assistant-flyout"
        paddingSize="none"
        hideCloseButton
        // EUI TODO: This z-index override of EuiOverlayMask is a workaround, and ideally should be resolved with a cleaner UI/UX flow long-term
        maskProps={{ style: `z-index: ${(euiTheme.levels.flyout as number) + 3}` }} // we need this flyout to be above the timeline flyout (which has a z-index of 1002)
        // type="push"
      >
        <Assistant
          conversationTitle={conversationTitle}
          promptContextId={promptContextId}
          onCloseFlyout={handleCloseModal}
          isFlyoutMode={isFlyoutMode}
          chatHistoryVisible={chatHistoryVisible}
          setChatHistoryVisible={toggleChatHistory}
          currentUserAvatar={currentUserAvatar}
        />
      </EuiFlyoutResizable>
    );
  }

  return (
    <>
      {isModalVisible && (
        <StyledEuiModal onClose={handleCloseModal} data-test-subj="ai-assistant-modal">
          <Assistant
            conversationTitle={conversationTitle}
            promptContextId={promptContextId}
            chatHistoryVisible={chatHistoryVisible}
            setChatHistoryVisible={toggleChatHistory}
            currentUserAvatar={currentUserAvatar}
          />
        </StyledEuiModal>
      )}
    </>
  );
});

AssistantOverlay.displayName = 'AssistantOverlay';
