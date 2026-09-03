/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { buildAnalyzeChat as defaultBuildAnalyzeChat } from './analyze_chat';
import type { AnalyzeAndImproveContext, AnalyzeChatOptions, ChatOpener } from './types';

/**
 * Builds the Analyze & improve chat opener. Returns undefined when Agent Builder is unavailable
 * or the user lacks the `agentBuilder.show` capability.
 */
export const createAnalyzeChatOpener = ({
  coreStart,
  agentBuilder,
  buildAnalyzeChat = defaultBuildAnalyzeChat,
}: {
  coreStart: CoreStart;
  agentBuilder: AgentBuilderPluginStart | undefined;
  buildAnalyzeChat?: (
    context: AnalyzeAndImproveContext
  ) => AnalyzeChatOptions | Promise<AnalyzeChatOptions>;
}): ChatOpener | undefined => {
  if (!agentBuilder || coreStart.application.capabilities.agentBuilder?.show !== true) {
    return undefined;
  }

  return async (ctx) => {
    const access = await agentBuilder.getAgentBuilderAccess();
    if (!access.hasRequiredLicense || !access.hasLlmConnector) {
      coreStart.notifications.toasts.addWarning({
        title: i18n.translate('xpack.contextEngine.chatOpener.noAccessTitle', {
          defaultMessage: 'Agent Builder is not available',
        }),
        text: i18n.translate('xpack.contextEngine.chatOpener.noAccessText', {
          defaultMessage:
            'Analyzing signals requires an enterprise license and a configured LLM connector.',
        }),
      });
      return;
    }
    const options = await buildAnalyzeChat(ctx);
    // Starting a conversation needs an agent to start it with. Reopening one does not: the run
    // that wrote it already chose, and it may have been the default agent rather than a configured
    // one, which leaves nothing recorded on the index to name here.
    if (!options.agentId && !options.conversationId) {
      return;
    }
    agentBuilder.openChat(options);
  };
};
