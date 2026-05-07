/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsMutating } from '@kbn/react-query';
import { mutationKeys } from '../mutation_keys';

/**
 * Returns true while ANY send/resume mutation is in flight, anywhere in the app.
 *
 * Single-stream-at-a-time is a current product constraint, so the global gates
 * (HITL Approve, submit button, page-leave guard) all read this. When concurrent
 * streams are unblocked in a follow-up PR, those gates become per-conversation
 * checks and most callers of this hook go away — but the page-leave guard will
 * still want a global "is anything in flight?" answer.
 */
export const useIsAnyConversationStreaming = () => {
  const numSending = useIsMutating({ mutationKey: mutationKeys.sendMessage, fetching: true });
  const numResuming = useIsMutating({ mutationKey: mutationKeys.resumeRound, fetching: true });
  return numSending > 0 || numResuming > 0;
};
