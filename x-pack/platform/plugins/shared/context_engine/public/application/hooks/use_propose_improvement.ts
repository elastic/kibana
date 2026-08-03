/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  CONTEXT_ENGINE_AGENT_ID,
  PATTERN_ATTACHMENT_TYPE,
} from '../../../common/agent_builder/constants';
import type { Pattern } from '../../../common/http_api/patterns';
import { useChatOpener } from './use_chat_opener';

const initialMessage = i18n.translate('xpack.contextEngine.proposeImprovement.initialMessage', {
  defaultMessage:
    'Propose an improvement for this failure pattern. Verify it against the source first, then suggest one bounded change.',
});

/**
 * Opens the management-agent chat with a failure pattern attached, so the agent
 * can propose an improvement. Available only when a downstream plugin has
 * registered the chat opener (see {@link useChatOpener}).
 */
export const useProposeImprovement = () => {
  const { openChat, isAvailable } = useChatOpener();

  const proposeImprovement = useCallback(
    (pattern: Pattern, representativeTraceIds: string[]) => {
      if (!isAvailable) {
        return;
      }
      openChat({
        agentId: CONTEXT_ENGINE_AGENT_ID,
        newConversation: true,
        autoSendInitialMessage: false,
        initialMessage,
        attachments: [
          {
            type: PATTERN_ATTACHMENT_TYPE,
            data: { pattern, representative_trace_ids: representativeTraceIds },
          },
        ],
      });
    },
    [openChat, isAvailable]
  );

  return { proposeImprovement, isAvailable };
};
