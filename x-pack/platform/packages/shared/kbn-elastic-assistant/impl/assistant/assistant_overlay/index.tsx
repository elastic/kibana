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

import { createGlobalStyle } from 'styled-components';
import type { ShowAssistantOverlayProps } from '../../assistant_context';
import { useAssistantContext } from '../../assistant_context';
import { Assistant, CONVERSATION_SIDE_PANEL_WIDTH } from '..';
import {
  useAssistantLastConversation,
  useAssistantSpaceId,
  type LastConversation,
} from '../use_space_aware_context';

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
  const spaceId = useAssistantSpaceId();
  const [isModalVisible, setIsModalVisible] = useState(false);
  // id if the conversation exists in the data stream, title if it's a new conversation
  const [lastConversation, setSelectedConversation] = useState<LastConversation | undefined>(
    undefined
  );
  const [promptContextId, setPromptContextId] = useState<string | undefined>();
  const { assistantTelemetry, setShowAssistantOverlay } = useAssistantContext();
  const { getLastConversation } = useAssistantLastConversation({ spaceId });

  const [chatHistoryVisible, setChatHistoryVisible] = useState(false);

  // Bind `showAssistantOverlay` in SecurityAssistantContext to this modal instance
  const showOverlay = useCallback(
    () =>
      ({
        showOverlay: so,
        promptContextId: pid,
        selectedConversation,
      }: ShowAssistantOverlayProps) => {
        const nextConversation = getLastConversation(selectedConversation);
        if (so) assistantTelemetry?.reportAssistantInvoked({ invokedBy: 'click' });

        setIsModalVisible(so);
        setPromptContextId(pid);
        setSelectedConversation(nextConversation);
      },
    [assistantTelemetry, getLastConversation]
  );
  useEffect(() => {
    setShowAssistantOverlay(showOverlay);
  }, [setShowAssistantOverlay, showOverlay]);

  // Called whenever platform specific shortcut for assistant is pressed
  const handleShortcutPress = useCallback(() => {
    // Try to restore the last conversation on shortcut pressed
    if (!isModalVisible) {
      setSelectedConversation(getLastConversation());
      assistantTelemetry?.reportAssistantInvoked({
        invokedBy: 'shortcut',
      });
    }

    setIsModalVisible(!isModalVisible);
  }, [isModalVisible, getLastConversation, assistantTelemetry]);

  const hasOpenedFromUrl = useRef(false);

  const handleOpenFromUrlState = useCallback(
    (id: string) => {
      if (!isModalVisible) {
        setSelectedConversation(getLastConversation({ id }));
        assistantTelemetry?.reportAssistantInvoked({
          invokedBy: 'url',
        });
        setIsModalVisible(true);
      }
    },
    [isModalVisible, getLastConversation, assistantTelemetry]
  );

  useEffect(() => {
    if (hasOpenedFromUrl.current) return;

    const params = new URLSearchParams(window.location.search);
    const assistantId = params.get('assistant');
    if (assistantId && !isModalVisible) {
      hasOpenedFromUrl.current = true;
      handleOpenFromUrlState(assistantId);
    }
  }, [handleOpenFromUrlState, isModalVisible]);
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
    setSelectedConversation(lastConversation);
  }, [lastConversation]);

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

  const flyoutRef = useRef<HTMLDivElement | null>(null);

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
          lastConversation={lastConversation}
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
