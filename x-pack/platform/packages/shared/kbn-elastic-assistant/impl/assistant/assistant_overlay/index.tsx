/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiFlyoutResizable } from '@elastic/eui';

import useEvent from 'react-use/lib/useEvent';
import { css } from '@emotion/react';
// eslint-disable-next-line @kbn/eslint/module_migration
import { createGlobalStyle } from 'styled-components';
import { ShowAssistantOverlayProps, useAssistantContext } from '../../assistant_context';
import { Assistant, CONVERSATION_SIDE_PANEL_WIDTH } from '..';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

/**
 * Modal container for Elastic AI Assistant conversations, receiving the page contents as context, plus whatever
 * component currently has focus and any specific context it may provide through the SAssInterface.
 */

export const UnifiedTimelineGlobalStyles = createGlobalStyle`
  body:has(.timeline-portal-overlay-mask) .euiOverlayMask {
    z-index: 1003 !important;
  }
`;

export const AssistantOverlay = React.memo(() => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  // Why is this named Title and not Id?
  const [conversationTitle, setConversationTitle] = useState<string | undefined>(undefined);
  const [promptContextId, setPromptContextId] = useState<string | undefined>();
  const { assistantTelemetry, setShowAssistantOverlay, getLastConversationId } =
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
        const conversationId = getLastConversationId(cTitle);
        if (so) assistantTelemetry?.reportAssistantInvoked({ conversationId, invokedBy: 'click' });

        setIsModalVisible(so);
        setPromptContextId(pid);
        setConversationTitle(conversationId);
      },
    [assistantTelemetry, getLastConversationId]
  );
  useEffect(() => {
    setShowAssistantOverlay(showOverlay);
  }, [setShowAssistantOverlay, showOverlay]);

  // Called whenever platform specific shortcut for assistant is pressed
  const handleShortcutPress = useCallback(() => {
    // Try to restore the last conversation on shortcut pressed
    if (!isModalVisible) {
      setConversationTitle(getLastConversationId());
      assistantTelemetry?.reportAssistantInvoked({
        invokedBy: 'shortcut',
        conversationId: getLastConversationId(),
      });
    }

    setIsModalVisible(!isModalVisible);
  }, [isModalVisible, getLastConversationId, assistantTelemetry]);

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

  return (
    <>
      <EuiFlyoutResizable
        ref={flyoutRef}
        css={css`
          max-inline-size: calc(100% - 20px);
          min-inline-size: 400px;
          > div {
            height: 100%;
          }
        `}
        onClose={handleCloseModal}
        data-test-subj="ai-assistant-flyout"
        paddingSize="none"
        hideCloseButton
      >
        <Assistant
          conversationTitle={conversationTitle}
          promptContextId={promptContextId}
          onCloseFlyout={handleCloseModal}
          chatHistoryVisible={chatHistoryVisible}
          setChatHistoryVisible={toggleChatHistory}
        />
      </EuiFlyoutResizable>
      <UnifiedTimelineGlobalStyles />
    </>
  );
});

AssistantOverlay.displayName = 'AssistantOverlay';
