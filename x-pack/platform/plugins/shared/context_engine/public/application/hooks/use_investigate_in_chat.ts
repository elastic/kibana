/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  AI_INDEX_ATTACHMENT_TYPE,
  CASE_ATTACHMENT_TYPE,
  CONTEXT_ENGINE_AGENT_ID,
} from '../../../common/agent_builder/constants';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type { Pattern, PatternCase } from '../../../common/http_api/patterns';
import { useChatOpener } from './use_chat_opener';

const initialMessage = i18n.translate('xpack.contextEngine.investigateInChat.initialMessage', {
  defaultMessage:
    'Help me fix this failing case. Use get_case_trace to inspect its agent trace, and get_ai_index_automations to review how this index builds knowledge items, then propose a bounded fix.',
});

/**
 * Opens the management-agent chat with a failing case attached (plus its AI index),
 * so the agent can pull the originating trace + the index's automations into context
 * and help fix the issue. Available only when a downstream plugin has registered the
 * chat opener (see {@link useChatOpener}).
 */
export const useInvestigateInChat = () => {
  const { openChat, isAvailable } = useChatOpener();

  const investigate = useCallback(
    ({
      aiIndex,
      patternCase,
      pattern,
    }: {
      aiIndex: GetAiIndexResponse;
      patternCase: PatternCase;
      pattern?: Pattern;
    }) => {
      if (!isAvailable) {
        return;
      }
      openChat({
        agentId: CONTEXT_ENGINE_AGENT_ID,
        newConversation: true,
        autoSendInitialMessage: false,
        initialMessage,
        attachments: [
          { type: AI_INDEX_ATTACHMENT_TYPE, data: aiIndex },
          {
            type: CASE_ATTACHMENT_TYPE,
            data: {
              case: patternCase,
              ai_index_id: aiIndex.id,
              traces_index: aiIndex.self_improvement?.traces_index,
              pattern: pattern
                ? { pattern_key: pattern.pattern_key, type: pattern.type, sub_type: pattern.sub_type }
                : undefined,
            },
          },
        ],
      });
    },
    [openChat, isAvailable]
  );

  return { investigate, isAvailable };
};
