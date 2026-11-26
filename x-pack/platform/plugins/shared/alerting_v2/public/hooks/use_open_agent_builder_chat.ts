/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { AGENT_BUILDER_NEW_CONVERSATION_PATH } from '../constants';

/**
 * Returns a callback that starts a new Agent Builder conversation in the side chat and sends the
 * message right away. Falls back to the Agent Builder app when the side chat is not available.
 */
export const useOpenAgentBuilderChat = (): ((message: string) => void) => {
  const { navigateToApp } = useService(CoreStart('application'));
  const agentBuilder = useService(PluginStart('agentBuilder'), { optional: true }) as
    | AgentBuilderPluginStart
    | undefined;

  return useCallback(
    (message: string) => {
      if (!agentBuilder?.openChat) {
        navigateToApp(AGENT_BUILDER_APP_ID, {
          path: AGENT_BUILDER_NEW_CONVERSATION_PATH,
          state: { initialMessage: message },
        });
        return;
      }
      agentBuilder.openChat({
        newConversation: true,
        initialMessage: message,
        autoSendInitialMessage: true,
      });
    },
    [agentBuilder, navigateToApp]
  );
};
