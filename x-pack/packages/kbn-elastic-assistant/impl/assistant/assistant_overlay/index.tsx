/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiModal, EuiFlyout } from '@elastic/eui';

import useEvent from 'react-use/lib/useEvent';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';
import { css } from '@emotion/react';
import { ShowAssistantOverlayProps, useAssistantContext } from '../../assistant_context';
import { Assistant } from '..';
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
}
export const AssistantOverlay = React.memo<Props>(({ isFlyoutMode }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [conversationTitle, setConversationTitle] = useState<string | undefined>(
    WELCOME_CONVERSATION_TITLE
  );
  const [promptContextId, setPromptContextId] = useState<string | undefined>();
  const { assistantTelemetry, setShowAssistantOverlay, getLastConversationTitle } =
    useAssistantContext();

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

  if (!isModalVisible) return null;

  if (isFlyoutMode) {
    return (
      <EuiFlyout
        css={css`
          inline-size: auto !important;

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
          isFlyoutMode={isFlyoutMode}
        />
      </EuiFlyout>
    );
  }

  return (
    <>
      {isModalVisible && (
        <StyledEuiModal onClose={handleCloseModal} data-test-subj="ai-assistant-modal">
          <Assistant conversationTitle={conversationTitle} promptContextId={promptContextId} />
        </StyledEuiModal>
      )}
    </>
  );
});

AssistantOverlay.displayName = 'AssistantOverlay';
