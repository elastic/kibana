/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { EuiFlyoutResizable } from '@elastic/eui';

import useEvent from 'react-use/lib/useEvent';
import { css } from '@emotion/react';
import { OnechatServicesContext, OnechatConversationsView } from '@kbn/onechat-plugin/public';

// eslint-disable-next-line @kbn/eslint/module_migration
import { createGlobalStyle } from 'styled-components';
import { useFindPrompts } from '../api/security_ai_prompts/use_find_prompts';
import {
  getAllPromptIds,
  formatPromptGroups,
  promptGroups,
} from '../assistant_body/starter_prompts';
import type { ShowOneChatOverlayProps } from '../../assistant_context';
import { useAssistantContext } from '../../assistant_context';
import { EMPTY_SCREEN_DESCRIPTION } from '../translations';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

/**
 * Modal container for One Chat conversations, receiving the page contents as context, plus whatever
 * component currently has focus and any specific context it may provide through the SAssInterface.
 */

export const UnifiedTimelineGlobalStyles = createGlobalStyle`
  body:has(.timeline-portal-overlay-mask) .euiOverlayMask {
    z-index: 1003 !important;
  }
`;

export const OneChatOverlay = React.memo(() => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [promptContextId, setPromptContextId] = useState<string | undefined>();
  // id if the conversation exists in the data stream, title if it's a new conversation
  const [connectorId, setConnectorId] = useState<string | undefined>(undefined);

  // TODO: Use promptContextId when implementing prompt context functionality
  // eslint-disable-next-line no-console
  console.log('Prompt context ID:', promptContextId);
  const {
    assistantTelemetry,
    setShowOneChatOverlay,
    assistantAvailability: { isAssistantEnabled },
    http,
    toasts,
    commentActionsMounter,
    onechatServices,
    alertsIndexPattern,
    knowledgeBase,
  } = useAssistantContext();

  // Bind `showOneChatOverlay` in SecurityAssistantContext to this modal instance
  const showOverlay = useCallback(
    () =>
      ({ showOverlay: so, promptContextId: pid }: ShowOneChatOverlayProps) => {
        if (so) assistantTelemetry?.reportAssistantInvoked({ invokedBy: 'click' });

        setIsModalVisible(so);
        setPromptContextId(pid);
      },
    [assistantTelemetry]
  );
  useEffect(() => {
    setShowOneChatOverlay(showOverlay);
  }, [setShowOneChatOverlay, showOverlay]);

  // Called whenever platform specific shortcut for assistant is pressed
  const handleShortcutPress = useCallback(() => {
    if (!isModalVisible) {
      assistantTelemetry?.reportAssistantInvoked({
        invokedBy: 'shortcut',
      });
    }

    setIsModalVisible(!isModalVisible);
  }, [isModalVisible, assistantTelemetry]);

  const hasOpenedFromUrl = useRef(false);

  const handleOpenFromUrlState = useCallback(
    (id: string) => {
      if (!isModalVisible) {
        assistantTelemetry?.reportAssistantInvoked({
          invokedBy: 'url',
        });
        setIsModalVisible(true);
      }
    },
    [isModalVisible, assistantTelemetry]
  );

  // Handle connector selection change
  const handleConnectorSelectionChange = useCallback((connector: { id: string }) => {
    if (connector?.id) {
      setConnectorId(connector.id);
    }
  }, []);

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
  }, []);

  const handleCloseModal = useCallback(() => {
    cleanupAndCloseModal();
  }, [cleanupAndCloseModal]);

  const flyoutRef = useRef<HTMLDivElement>();

  const {
    data: { prompts: actualPrompts },
  } = useFindPrompts({
    context: {
      isAssistantEnabled,
      httpFetch: http.fetch,
      toasts,
    },
    params: {
      connector_id: connectorId,
      prompt_group_id: 'aiAssistant',
      prompt_ids: getAllPromptIds(promptGroups),
    },
  });

  const fetchedPromptGroups = useMemo(() => {
    if (!actualPrompts.length) {
      return [];
    }
    return formatPromptGroups(actualPrompts);
  }, [actualPrompts]);

  const trackPrompt = useCallback(
    (promptTitle: string) => {
      assistantTelemetry?.reportAssistantStarterPrompt({
        promptTitle,
      });
    },
    [assistantTelemetry]
  );

  const onSelectPrompt = useCallback(
    (prompt: string, title: string) => {
      trackPrompt(title);
    },
    [trackPrompt]
  );

  // Move setConversationSettings to useEffect to avoid setState during render
  useEffect(() => {
    if (onechatServices && isModalVisible) {
      onechatServices.conversationSettingsService.setConversationSettings({
        isFlyoutMode: true,
        newConversationSubtitle: EMPTY_SCREEN_DESCRIPTION,
        newConversationPrompts: fetchedPromptGroups,
        onSelectPrompt,
        onConnectorSelectionChange: handleConnectorSelectionChange,
        defaultAgentId: 'siem-security-analyst',
        commentActionsMounter,
        toolParameters: {
          alertsIndexPattern,
          size: knowledgeBase.latestAlerts,
        },
        customMenuItems: [],
      });
    }
  }, [
    onechatServices,
    isModalVisible,
    fetchedPromptGroups,
    commentActionsMounter,
    alertsIndexPattern,
    knowledgeBase.latestAlerts,
    handleConnectorSelectionChange,
    onSelectPrompt,
  ]);

  if (!isModalVisible || !OnechatConversationsView || !onechatServices) return null;

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
        data-test-subj="onechat-flyout"
        paddingSize="none"
        hideCloseButton
        aria-label="One Chat Assistant"
      >
        <OnechatServicesContext.Provider value={onechatServices}>
          <OnechatConversationsView />
        </OnechatServicesContext.Provider>
      </EuiFlyoutResizable>
      <UnifiedTimelineGlobalStyles />
    </>
  );
});

OneChatOverlay.displayName = 'OneChatOverlay';
