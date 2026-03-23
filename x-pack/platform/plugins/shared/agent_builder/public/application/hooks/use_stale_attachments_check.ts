/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import useEvent from 'react-use/lib/useEvent';
import { useDebounceFn } from '@kbn/react-hooks';
import {
  hashContent,
  isFreshAttachmentStalenessCheckError,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentInput, StaleAttachment } from '@kbn/agent-builder-common/attachments';
import { labels } from '../utils/i18n';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useToasts } from './use_toasts';

const STALE_CHECK_DEBOUNCE_MS = 300;
const STALE_CHECK_DEBOUNCE_OPTIONS = { wait: STALE_CHECK_DEBOUNCE_MS } as const;

export interface UseStaleAttachmentsCheckResult {
  staleAttachments: AttachmentInput[];
  scheduleStaleCheck: () => void;
}

/**
 * Fetches attachment staleness for the active conversation.
 * Stale checks are triggered when:
 * - the user visits a conversation (conversationId changes)
 * - the window regains focus
 */
export const useStaleAttachments = (
  conversationId: string | undefined
): UseStaleAttachmentsCheckResult => {
  const { attachmentsService } = useAgentBuilderServices();
  const { addErrorToast } = useToasts();
  const [staleAttachments, setStaleAttachments] = useState<AttachmentInput[]>([]);

  // Always hold the latest stale attachments to avoid stale-closure issues in the debounced fn.
  const staleAttachmentsRef = useRef(staleAttachments);
  staleAttachmentsRef.current = staleAttachments;

  const { run: scheduleStaleCheck } = useDebounceFn(async () => {
    if (!conversationId) {
      setStaleAttachments([]);
      return;
    }

    const response = await attachmentsService.checkStale(conversationId);
    const attachments = response.attachments ?? [];

    const checkFailed = attachments.filter(isFreshAttachmentStalenessCheckError);
    const errorLines = checkFailed.map(({ id, error }) => `${error} (attachment id: ${id})`).sort();
    if (errorLines.length > 0) {
      addErrorToast({
        title: labels.conversations.staleCheckPartialFailureTitle,
        text: errorLines.join('\n'),
      });
    }

    const stale = attachments
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
