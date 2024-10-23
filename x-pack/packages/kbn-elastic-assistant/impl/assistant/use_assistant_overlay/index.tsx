/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Replacements } from '@kbn/elastic-assistant-common';
import { useCallback, useEffect, useMemo } from 'react';

import { useAssistantContext } from '../../assistant_context';
import { getUniquePromptContextId } from '../../assistant_context/helpers';
import type { PromptContext } from '../prompt_context/types';
import { useConversation } from '../use_conversation';
import { getDefaultConnector, mergeBaseWithPersistedConversations } from '../helpers';
import { getGenAiConfig } from '../../connectorland/helpers';
import { useLoadConnectors } from '../../connectorland/use_load_connectors';
import { FetchConversationsResponse, useFetchCurrentUserConversations } from '../api';
import { Conversation } from '../../assistant_context/types';

interface UseAssistantOverlay {
  showAssistantOverlay: (show: boolean, silent?: boolean) => void;
  promptContextId: string;
}

/**
 * `useAssistantOverlay` is a hook that registers context with the assistant overlay, and
 * returns an optional `showAssistantOverlay` function to display the assistant overlay.
 * As an alterative to using the `showAssistantOverlay` returned from this hook, you may
 * use the `NewChatByTitle` component and pass it the `promptContextId` returned by this hook.
 *
 * USE THIS WHEN: You want to register context in one part of the tree, and then show
 * a _New chat_ button in another part of the tree without passing around the data, or when
 * you want to build a custom `New chat` button with features not not provided by the
 * `NewChat` component.
 */
export const useAssistantOverlay = (
  /**
   * The category of data, e.g. `alert | alerts | event | events | string`
   *
   * `category` helps the assistant display the most relevant user prompts
   */
  category: PromptContext['category'],

  /**
   * optionally automatically add this context to a specific conversation when the assistant is displayed
   */
  conversationTitle: string | null,

  /**
   * The assistant will display this **short**, static description
   * in the context pill
   */
  description: PromptContext['description'],

  /**
   * The assistant will invoke this function to retrieve the context data,
   * which will be included in a prompt (e.g. the contents of an alert or an event)
   */
  getPromptContext: PromptContext['getPromptContext'],

  /**
   * Optionally provide a unique identifier for this prompt context, or accept the uuid default.
   */
  id: PromptContext['id'] | null,

  /**
   * An optional user prompt that's filled in, but not sent, when the Elastic AI Assistant opens
   */
  suggestedUserPrompt: PromptContext['suggestedUserPrompt'] | null,

  /**
   * The assistant will display this tooltip when the user hovers over the context pill
   */
  tooltip: PromptContext['tooltip'],

  /** Required to identify the availability of the Assistant for the current license level */
  isAssistantEnabled: boolean,

  /**
   * Optionally provide a map of replacements associated with the context, i.e. replacements for an attack discovery that's provided as context
   */
  replacements?: Replacements | null
): UseAssistantOverlay => {
  const { http } = useAssistantContext();
  const { data: connectors } = useLoadConnectors({
    http,
  });

  const defaultConnector = useMemo(() => getDefaultConnector(connectors), [connectors]);
  const apiConfig = useMemo(() => getGenAiConfig(defaultConnector), [defaultConnector]);

  const { createConversation } = useConversation();

  const onFetchedConversations = useCallback(
    (conversationsData: FetchConversationsResponse): Record<string, Conversation> =>
      mergeBaseWithPersistedConversations({}, conversationsData),
    []
  );
  const { data: conversations, isLoading } = useFetchCurrentUserConversations({
    http,
    onFetch: onFetchedConversations,
    isAssistantEnabled,
  });
  // memoize the props so that we can use them in the effect below:
  const _category: PromptContext['category'] = useMemo(() => category, [category]);
  const _description: PromptContext['description'] = useMemo(() => description, [description]);
  const _getPromptContext: PromptContext['getPromptContext'] = useMemo(
    () => getPromptContext,
    [getPromptContext]
  );
  const promptContextId: PromptContext['id'] = useMemo(
    () => id ?? getUniquePromptContextId(),
    [id]
  );
  const _suggestedUserPrompt: PromptContext['suggestedUserPrompt'] = useMemo(
    () => suggestedUserPrompt ?? undefined,
    [suggestedUserPrompt]
  );
  const _tooltip = useMemo(() => tooltip, [tooltip]);
  const _replacements = useMemo(() => replacements, [replacements]);

  // the assistant context is used to show/hide the assistant overlay:
  const {
    registerPromptContext,
    showAssistantOverlay: assistantContextShowOverlay,
    unRegisterPromptContext,
  } = useAssistantContext();

  // proxy show / hide calls to assistant context, using our internal prompt context id:
  // silent:boolean doesn't show the toast notification if the conversation is not found
  const showAssistantOverlay = useCallback(
    // shouldCreateConversation should only be passed for
    // non-default conversations that may need to be initialized
    async (showOverlay: boolean, shouldCreateConversation: boolean = false) => {
      if (promptContextId != null) {
        if (shouldCreateConversation) {
          let conversation;
          if (!isLoading) {
            conversation = conversationTitle
              ? Object.values(conversations).find((conv) => conv.title === conversationTitle)
              : undefined;
          }

          if (isAssistantEnabled && !conversation && defaultConnector && !isLoading) {
            try {
              await createConversation({
                apiConfig: {
                  ...apiConfig,
                  actionTypeId: defaultConnector?.actionTypeId,
                  connectorId: defaultConnector?.id,
                },
                category: 'assistant',
                title: conversationTitle ?? '',
              });
            } catch (e) {
              /* empty */
            }
          }
        }
        assistantContextShowOverlay({
          showOverlay,
          promptContextId,
          conversationTitle: conversationTitle ?? undefined,
        });
      }
    },
    [
      apiConfig,
      assistantContextShowOverlay,
      conversationTitle,
      conversations,
      createConversation,
      defaultConnector,
      isAssistantEnabled,
      isLoading,
      promptContextId,
    ]
  );

  useEffect(() => {
    unRegisterPromptContext(promptContextId); // a noop if the current prompt context id is not registered

    const newContext: PromptContext = {
      category: _category,
      description: _description,
      getPromptContext: _getPromptContext,
      id: promptContextId,
      suggestedUserPrompt: _suggestedUserPrompt,
      tooltip: _tooltip,
      replacements: _replacements ?? undefined,
    };

    registerPromptContext(newContext);

    return () => unRegisterPromptContext(promptContextId);
  }, [
    _category,
    _description,
    _getPromptContext,
    _replacements,
    _suggestedUserPrompt,
    _tooltip,
    promptContextId,
    registerPromptContext,
    unRegisterPromptContext,
  ]);

  return { promptContextId, showAssistantOverlay };
};
