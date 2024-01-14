/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiModal } from '@elastic/eui';

import useEvent from 'react-use/lib/useEvent';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';
import { ShowAssistantOverlayProps, useAssistantContext } from '../../assistant_context';
import { Assistant } from '..';
import { WELCOME_CONVERSATION_TITLE } from '../use_conversation/translations';
import { useFetchCurrentUserConversations } from '../api/conversations/use_fetch_current_user_conversations';

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
export const AssistantOverlay = React.memo(() => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    WELCOME_CONVERSATION_TITLE
  );
  const [promptContextId, setPromptContextId] = useState<string | undefined>();
  const { assistantTelemetry, setShowAssistantOverlay } = useAssistantContext();

  const { data: conversationsData, isLoading } = useFetchCurrentUserConversations();

  const lastConversationId = useMemo(() => {
    if (!isLoading) {
      const sorted = conversationsData?.data.sort((convA, convB) =>
        convA.updatedAt && convB.updatedAt && convA.updatedAt > convB.updatedAt ? -1 : 1
      );
      if (sorted && sorted.length > 0) {
        return sorted[0].id;
      }
    }
    return WELCOME_CONVERSATION_TITLE;
  }, [conversationsData?.data, isLoading]);

  // Bind `showAssistantOverlay` in SecurityAssistantContext to this modal instance
  const showOverlay = useCallback(
    () =>
      ({
        showOverlay: so,
        promptContextId: pid,
        conversationId: cid,
      }: ShowAssistantOverlayProps) => {
        const newConversationId = cid ?? lastConversationId;
        if (so)
          assistantTelemetry?.reportAssistantInvoked({
            conversationId: newConversationId,
            invokedBy: 'click',
          });

        setIsModalVisible(so);
        setPromptContextId(pid);
        setConversationId(newConversationId);
      },
    [assistantTelemetry, lastConversationId]
  );
  useEffect(() => {
    setShowAssistantOverlay(showOverlay);
  }, [setShowAssistantOverlay, showOverlay]);

  // Called whenever platform specific shortcut for assistant is pressed
  const handleShortcutPress = useCallback(() => {
    // Try to restore the last conversation on shortcut pressed
    if (!isModalVisible) {
      setConversationId(lastConversationId);
      assistantTelemetry?.reportAssistantInvoked({
        invokedBy: 'shortcut',
        conversationId: lastConversationId,
      });
    }

    setIsModalVisible(!isModalVisible);
  }, [isModalVisible, lastConversationId, assistantTelemetry]);

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
    setConversationId(conversationId);
  }, [conversationId]);

  const handleCloseModal = useCallback(() => {
    cleanupAndCloseModal();
  }, [cleanupAndCloseModal]);

  return (
    <>
      {isModalVisible && (
        <StyledEuiModal onClose={handleCloseModal} data-test-subj="ai-assistant-modal">
          <Assistant conversationId={conversationId} promptContextId={promptContextId} />
        </StyledEuiModal>
      )}
    </>
  );
});

AssistantOverlay.displayName = 'AssistantOverlay';
