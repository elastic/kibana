/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type { AiIndexConversationState } from '../../types';
import { useKibana } from './use_kibana';

interface UseSuggestAutomationParams {
  aiIndex: GetAiIndexResponse | undefined;
  isManaged: boolean;
  onSaved: () => void;
}

interface UseSuggestAutomationResult {
  canSuggest: boolean;
  suggestAutomation: () => void;
  startGuidedSetup: () => void;
  /** What these buttons already have going for this index, so the caller can offer to continue. */
  conversation: AiIndexConversationState;
}

const NO_CONVERSATION: AiIndexConversationState = { isRunning: false };

export type { UseSuggestAutomationResult };

export const useSuggestAutomation = ({
  aiIndex,
  isManaged,
  onSaved,
}: UseSuggestAutomationParams): UseSuggestAutomationResult => {
  const {
    services: { getAgentBuilderIntegration },
  } = useKibana();

  const provider = getAgentBuilderIntegration?.()?.suggestAutomation;

  const onSavedRef = useRef(onSaved);
  useLayoutEffect(() => {
    onSavedRef.current = onSaved;
  });

  const canSuggest = useMemo(
    () => provider?.canSuggest({ aiIndex, isManaged }) ?? false,
    [provider, aiIndex, isManaged]
  );

  useEffect(() => {
    if (!canSuggest || !aiIndex?.id || !provider) {
      return;
    }

    return provider.subscribeToAutomationSaved(aiIndex.id, () => {
      onSavedRef.current();
    });
  }, [provider, canSuggest, aiIndex?.id]);

  const [conversation, setConversation] = useState<AiIndexConversationState>(NO_CONVERSATION);

  useEffect(() => {
    const aiIndexId = aiIndex?.id;
    if (!canSuggest || !aiIndexId || !provider) {
      // Reset rather than leaving the last index's conversation on screen while routing.
      setConversation(NO_CONVERSATION);
      return;
    }

    return provider.subscribeToConversationState(aiIndexId, setConversation);
  }, [provider, canSuggest, aiIndex?.id]);

  const suggestAutomation = useCallback(() => {
    if (!canSuggest || !aiIndex || !provider) {
      return;
    }

    provider.suggestAutomation({
      aiIndex,
      onSaved: () => onSavedRef.current(),
    });
  }, [provider, aiIndex, canSuggest]);

  const startGuidedSetup = useCallback(() => {
    if (!canSuggest || !aiIndex || !provider) {
      return;
    }

    provider.startGuidedSetup({
      aiIndex,
      onSaved: () => onSavedRef.current(),
    });
  }, [provider, aiIndex, canSuggest]);

  return { canSuggest, suggestAutomation, startGuidedSetup, conversation };
};
