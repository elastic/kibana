/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { getEpisodeAttachment } from './get_episode_attachment';

export interface UseAddEpisodeToChatResult {
  addToChat: () => void;
  isAddToChatAvailable: boolean;
}

/**
 * Opens Agent Builder chat with the given episode attached (Cases-style button pattern).
 * Does not auto-send a prompt — the user drives the conversation.
 */
export const useAddEpisodeToChat = (
  episode: AlertEpisode | undefined
): UseAddEpisodeToChatResult => {
  const application = useService(CoreStart('application'));
  const agentBuilder = useService(PluginStart('agentBuilder'), {
    optional: true,
  }) as AgentBuilderPluginStart | undefined;
  const spaces = useService(PluginStart('spaces')) as SpacesPluginStart;

  const hasAgentBuilderCapability = application.capabilities.agentBuilder?.show === true;
  const isAddToChatAvailable =
    Boolean(episode) && hasAgentBuilderCapability && Boolean(agentBuilder?.openChat);

  const addToChat = useCallback(() => {
    if (!isAddToChatAvailable || !agentBuilder?.openChat || !episode) {
      return;
    }

    void spaces.getActiveSpace().then((space) => {
      agentBuilder.openChat({
        autoSendInitialMessage: false,
        newConversation: true,
        attachments: [getEpisodeAttachment(episode, space.id)],
      });
    });
  }, [agentBuilder, episode, isAddToChatAvailable, spaces]);

  return useMemo(
    () => ({
      addToChat,
      isAddToChatAvailable,
    }),
    [addToChat, isAddToChatAvailable]
  );
};
