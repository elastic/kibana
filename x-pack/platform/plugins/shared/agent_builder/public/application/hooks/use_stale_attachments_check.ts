/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import useEvent from 'react-use/lib/useEvent';
import { useDebounceFn } from '@kbn/react-hooks';
import { hashContent } from '@kbn/agent-builder-common/attachments';
import type { StaleAttachment } from '@kbn/agent-builder-common/attachments';
import type { ConverseAttachmentInput } from '../../../common/http_api/chat';
import { useAgentBuilderServices } from './use_agent_builder_service';

const STALE_CHECK_DEBOUNCE_MS = 300;
const STALE_CHECK_DEBOUNCE_OPTIONS = { wait: STALE_CHECK_DEBOUNCE_MS } as const;

export interface UseStaleAttachmentsCheckResult {
  staleAttachments: ConverseAttachmentInput[];
  scheduleStaleCheck: () => void;
}

/**
 * Fetches attachment staleness for the active conversation.
 * Stale checks are triggered when:
 * - the user visits a conversation (conversationId changes)
 * - the window regains focus
 * - the message input is focused (via scheduleStaleCheck from ConversationInput)
 */
export const useStaleAttachments = (
  conversationId: string | undefined
): UseStaleAttachmentsCheckResult => {
  const { attachmentsService } = useAgentBuilderServices();
  const [staleAttachments, setStaleAttachments] = useState<ConverseAttachmentInput[]>([]);

  // Always hold the latest stale attachments to avoid stale-closure issues in the debounced fn.
  const staleAttachmentsRef = useRef(staleAttachments);
  staleAttachmentsRef.current = staleAttachments;

  const { run: scheduleStaleCheck } = useDebounceFn(async () => {
    if (!conversationId) {
      setStaleAttachments([]);
      return;
    }

    const response = await attachmentsService.checkStale(conversationId);
    const stale = (response.attachments ?? [])
      .filter((attachment): attachment is StaleAttachment => attachment.is_stale)
      .map(({ is_stale, origin, ...attachment }) => attachment);

    if (hashContent(stale) === hashContent(staleAttachmentsRef.current)) {
      return;
    }

    setStaleAttachments(stale);
  }, STALE_CHECK_DEBOUNCE_OPTIONS);

  useEffect(() => {
    setStaleAttachments([]);
    scheduleStaleCheck();
  }, [conversationId, scheduleStaleCheck]);

  useEvent('focus', scheduleStaleCheck);

  return { staleAttachments, scheduleStaleCheck };
};
