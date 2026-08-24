/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { getFeedbackContext } from './application/api/feedback_loop';
import type { AnalyzeAndImproveContext, AnalyzeChatOptions } from './types';

/**
 * Builds Agent Builder `openChat` options for an Analyze & improve hand-off.
 *
 * The briefing is fetched from the same server route a scheduled run calls, so the interactive and
 * automatic paths hand the agent identical information: the index configuration, its knowledge
 * indicators, the signals, and every prior suggestion with its outcome. It travels as an attachment
 * rather than as the message so the reviewer can read (and the agent can quote) it, leaving the
 * message itself to state the ask.
 */
export const buildAnalyzeChat = async (
  { aiIndex, tag }: AnalyzeAndImproveContext,
  { http }: { http: HttpStart }
): Promise<AnalyzeChatOptions> => {
  const context = await getFeedbackContext(http, { aiIndexId: aiIndex.id });

  return {
    // Resolved server-side: the index's configured agent, or the built-in feedback-loop agent.
    agentId: context.agent_id,
    newConversation: true,
    sessionTag: `context-engine-feedback:${aiIndex.id}`,
    initialMessage: tag
      ? i18n.translate('xpack.contextEngine.analyzeChat.initialMessageForTag', {
          defaultMessage:
            'Review the attached briefing for the "{aiIndexId}" AI index and propose improvements. Focus on the signals tagged "{tag}".',
          values: { aiIndexId: aiIndex.id, tag },
        })
      : i18n.translate('xpack.contextEngine.analyzeChat.initialMessage', {
          defaultMessage:
            'Review the attached briefing for the "{aiIndexId}" AI index and propose improvements.',
          values: { aiIndexId: aiIndex.id },
        }),
    autoSendInitialMessage: true,
    attachments: [
      {
        id: `context-engine-ai-index:${aiIndex.id}`,
        type: AttachmentType.text,
        data: { content: context.prompt },
      },
    ],
  };
};
