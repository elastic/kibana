/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import useEvent from 'react-use/lib/useEvent';
import { useDebounceFn } from '@kbn/react-hooks';
import type { CheckStaleAttachmentsResponse } from '../../../common/http_api/attachments';
import { useAgentBuilderServices } from './use_agent_builder_service';

const STALE_CHECK_DEBOUNCE_MS = 300;
const STALE_CHECK_DEBOUNCE_OPTIONS = { wait: STALE_CHECK_DEBOUNCE_MS } as const;

export interface UseStaleAttachmentsCheckResult {
  staleResponse: CheckStaleAttachmentsResponse | undefined;
  scheduleStaleCheck: () => void;
}

/**
 * Fetches attachment staleness for the active conversation.
 * Stale checks are triggered when:
 * - the user visits a conversation (conversationId changes)
 * - the window regains focus
 * - the message input is focused (via scheduleStaleCheck from ConversationInput)
 */
export const useStaleAttachmentsCheck = (
  conversationId: string | undefined
): UseStaleAttachmentsCheckResult => {
  const { attachmentsService } = useAgentBuilderServices();
  const [staleResponse, setStaleResponse] = useState<CheckStaleAttachmentsResponse | undefined>(
    undefined
  );
  const isStaleCheckInFlightRef = useRef(false);

  const { run: scheduleStaleCheck } = useDebounceFn(async () => {
    if (!conversationId) {
      setStaleResponse(undefined);
      return;
    }

    if (isStaleCheckInFlightRef.current) {
      return;
    }

    isStaleCheckInFlightRef.current = true;
    try {
      const response = await attachmentsService.checkStale(conversationId);
      setStaleResponse(response);
    } finally {
      isStaleCheckInFlightRef.current = false;
    }
  }, STALE_CHECK_DEBOUNCE_OPTIONS);

  useEffect(() => {
    scheduleStaleCheck();
  }, [conversationId, scheduleStaleCheck]);

  useEvent('focus', scheduleStaleCheck);

  return { staleResponse, scheduleStaleCheck };
};
