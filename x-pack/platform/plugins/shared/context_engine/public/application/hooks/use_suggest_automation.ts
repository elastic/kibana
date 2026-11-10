/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { useKibana } from './use_kibana';
import { useSpaceId } from './use_space_id';

interface UseSuggestAutomationParams {
  aiIndex: GetAiIndexResponse | undefined;
  isManaged: boolean;
  onSaved: () => void;
}

interface UseSuggestAutomationResult {
  canSuggest: boolean;
  isSuggesting: boolean;
  suggestAutomation: () => Promise<void>;
}

export type { UseSuggestAutomationResult };

export const useSuggestAutomation = ({
  aiIndex,
  isManaged,
  onSaved,
}: UseSuggestAutomationParams): UseSuggestAutomationResult => {
  const {
    services: { getAgentBuilderIntegration, spaces },
  } = useKibana();
  const { spaceId } = useSpaceId(spaces);
  const [isSuggesting, setIsSuggesting] = useState(false);

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

  const suggestAutomation = useCallback(async () => {
    if (isSuggesting || !canSuggest || !aiIndex || !provider || !spaceId) {
      return;
    }

    setIsSuggesting(true);
    try {
      await provider.suggestAutomation({
        aiIndex,
        spaceId,
        onSaved: () => onSavedRef.current(),
      });
    } finally {
      setIsSuggesting(false);
    }
  }, [provider, aiIndex, canSuggest, isSuggesting, spaceId]);

  return { canSuggest, isSuggesting, suggestAutomation };
};
