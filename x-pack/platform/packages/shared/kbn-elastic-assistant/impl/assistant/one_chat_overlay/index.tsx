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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OnechatServicesContext } from '@kbn/onechat-plugin/public';

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
import { AssistantSettingsContextMenu } from '../settings/settings_context_menu/settings_context_menu';
import { useAssistantLastConversation } from '../use_space_aware_context/use_last_conversation';
import { useAssistantSpaceId } from '../use_space_aware_context';
import type { LastConversation } from '../use_space_aware_context';

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
  const [lastConversation, setSelectedConversation] = useState<LastConversation | undefined>(
    undefined
  );
  const [connectorId, setConnectorId] = useState<string | undefined>(undefined);
  const {
    assistantTelemetry,
    setShowOneChatOverlay,
    assistantAvailability: { isAssistantEnabled },
    http,
    toasts,
  } = useAssistantContext();
  const spaceId = useAssistantSpaceId();
  const { getLastConversation, setLastConversation } = useAssistantLastConversation({ spaceId });

  const { services } = useKibana();
  const OnechatConversationsView = services.onechat?.OnechatConversationsView;
  const onechatServices = services.onechat?.internalServices;

  // Bind `showOneChatOverlay` in SecurityAssistantContext to this modal instance
  const showOverlay = useCallback(
    () =>
      ({
        showOverlay: so,
        promptContextId: pid,
        selectedConversation,
      }: ShowOneChatOverlayProps) => {
        const nextConversation = getLastConversation(selectedConversation);
        if (so) assistantTelemetry?.reportAssistantInvoked({ invokedBy: 'click' });

        setIsModalVisible(so);
        setPromptContextId(pid);
        setSelectedConversation(nextConversation);
      },
    [assistantTelemetry, getLastConversation]
  );
  useEffect(() => {
    setShowOneChatOverlay(showOverlay);
  }, [setShowOneChatOverlay, showOverlay]);

  // Called whenever platform specific shortcut for assistant is pressed
  const handleShortcutPress = useCallback(() => {
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
    setSelectedConversation(undefined);
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

  const assistantSettings = useMemo(() => {
    return (
      <AssistantSettingsContextMenu
        isDisabled={false}
        isOneChatMode={true}
        selectedConnectorId={connectorId}
        onConnectorSelectionChange={handleConnectorSelectionChange}
      />
    );
  }, [connectorId, handleConnectorSelectionChange]);

  // Move setConversationSettings to useEffect to avoid setState during render
  useEffect(() => {
    if (onechatServices && isModalVisible) {
      onechatServices.conversationSettingsService.setConversationSettings({
        isFlyoutMode: true,
        selectedConversationId: lastConversation?.id,
        newConversationSubtitle: EMPTY_SCREEN_DESCRIPTION,
        newConversationPrompts: fetchedPromptGroups,
        selectedConnectorId: connectorId,
        settingsMenuComponent: assistantSettings,
        setLastConversation,
        defaultAgentId: 'siem-security-analyst',
      });
    }
  }, [
    onechatServices,
    isModalVisible,
    getLastConversation,
    fetchedPromptGroups,
    connectorId,
    assistantSettings,
    setLastConversation,
    lastConversation,
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
