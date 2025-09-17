/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { ConversationsFlyout, OnechatServicesContext } from '@kbn/onechat-plugin/public';

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
import { useConversationMenuItems } from '../settings/settings_context_menu/use_conversation_menu_items';
import { SelectedPromptContexts } from '../prompt_editor/selected_prompt_contexts';
import type { PromptContext, SelectedPromptContext } from '../prompt_context/types';
import { getNewSelectedPromptContext } from '../../data_anonymization/get_new_selected_prompt_context';
import { useDataStreamApis } from '../use_data_stream_apis';
import { getCombinedMessage } from '../prompt/helpers';

export const UnifiedTimelineGlobalStyles = createGlobalStyle`
  body:has(.timeline-portal-overlay-mask) .euiOverlayMask {
    z-index: 1003 !important;
  }
`;

export const OneChatOverlay = React.memo(() => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  // TODO: Use userPrompt for setting initial prompt in conversation
  const [contextPrompt, setContextPrompt] = useState<string | undefined>(undefined);
  const [promptContextId, setPromptContextId] = useState<string | undefined>();
  // id if the conversation exists in the data stream, title if it's a new conversation
  const [connectorId, setConnectorId] = useState<string | undefined>(undefined);
  // TODO: Implement prompt context registration functionality
  const [selectedPromptContexts, setSelectedPromptContexts] = useState<
    Record<string, SelectedPromptContext>
  >({});

  // TODO: Use promptContextId when implementing prompt context functionality
  const {
    assistantTelemetry,
    setShowOneChatOverlay,
    assistantAvailability: { isAssistantEnabled },
    http,
    toasts,
    commentActionsMounter,
    promptContexts,
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

  // Modal control functions
  const cleanupAndCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setPromptContextId(undefined);
  }, []);

  const handleCloseModal = useCallback(() => {
    cleanupAndCloseModal();
  }, [cleanupAndCloseModal]);

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

  // Get conversation menu items from the helper hook
  const { menuItems: conversationMenuItems, modals: conversationModals } =
    useConversationMenuItems();

  // Get anonymization fields from the API
  const { anonymizationFields } = useDataStreamApis({
    http,
    isAssistantEnabled,
  });

  useEffect(() => {
    const promptContext: PromptContext | undefined = promptContexts[promptContextId ?? ''];
    if (promptContext != null) {
      if (!Object.keys(selectedPromptContexts).includes(promptContext.id)) {
        const addNewSelectedPromptContext = async () => {
          const newSelectedPromptContext = await getNewSelectedPromptContext({
            anonymizationFields,
            promptContext,
          });
          setSelectedPromptContexts((prev) => ({
            ...prev,
            [promptContext.id]: newSelectedPromptContext,
          }));
        };

        addNewSelectedPromptContext();
      }

      if (promptContext.suggestedUserPrompt != null) {
        setContextPrompt(promptContext.suggestedUserPrompt);
      }
    }
  }, [
    promptContextId,
    promptContexts,
    selectedPromptContexts,
    setSelectedPromptContexts,
    anonymizationFields,
  ]);

  // Memoized SelectedPromptContexts component
  const memoizedSelectedPromptContexts = useMemo(() => {
    return (
      <SelectedPromptContexts
        promptContexts={promptContexts}
        selectedPromptContexts={selectedPromptContexts}
        setSelectedPromptContexts={setSelectedPromptContexts}
        currentReplacements={undefined} // TODO: Get from current conversation when available
      />
    );
  }, [promptContexts, selectedPromptContexts]);

  // Transform user context prompt handler
  const transformUserContextPrompt = useCallback(
    (promptText: string) => {
      const userMessage = getCombinedMessage({
        currentReplacements: {},
        promptText,
        selectedPromptContexts,
      });
      return userMessage.content ?? '';
    },
    [selectedPromptContexts]
  );

  // Move setConversationSettings to useEffect to avoid setState during render
  useEffect(() => {
    if (onechatServices) {
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
        customMenuItems: conversationMenuItems,
        selectedContextComponent: memoizedSelectedPromptContexts,
        contextPrompt,
        transformUserContextPrompt,
      });
    }
  }, [
    onechatServices,
    fetchedPromptGroups,
    commentActionsMounter,
    alertsIndexPattern,
    knowledgeBase.latestAlerts,
    handleConnectorSelectionChange,
    onSelectPrompt,
    conversationMenuItems,
    memoizedSelectedPromptContexts,
    promptContexts,
    contextPrompt,
    transformUserContextPrompt,
  ]);

  if (!onechatServices) return null;

  return (
    <OnechatServicesContext.Provider value={onechatServices}>
      <ConversationsFlyout
        isVisible={isModalVisible}
        onClose={handleCloseModal}
        handleShortcutPress={handleShortcutPress}
      />
      <UnifiedTimelineGlobalStyles />
      {conversationModals}
    </OnechatServicesContext.Provider>
  );
});

OneChatOverlay.displayName = 'OneChatOverlay';
