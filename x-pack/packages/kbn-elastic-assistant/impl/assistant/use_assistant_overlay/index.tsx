/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useAssistantContext } from '../../assistant_context';
import { getUniquePromptContextId } from '../../assistant_context/helpers';
import type { PromptContext } from '../prompt_context/types';

interface Props {
  promptContext?: Omit<PromptContext, 'id'>;
  promptContextId?: string;
  conversationId?: string;
}
interface UseAssistantOverlay {
  showAssistantOverlay: (show: boolean) => void;
  promptContextId: string;
}

export const useAssistantOverlay = ({
  conversationId,
  promptContext,
  promptContextId,
}: Props): UseAssistantOverlay => {
  // create a unique prompt context id if one is not provided:
  const _promptContextId = useMemo(
    () => promptContextId ?? getUniquePromptContextId(),
    [promptContextId]
  );

  const _promptContextRef = useRef<PromptContext | undefined>(
    promptContext != null
      ? {
          ...promptContext,
          id: _promptContextId,
        }
      : undefined
  );

  // the assistant context is used to show/hide the assistant overlay:
  const {
    registerPromptContext,
    showAssistantOverlay: assistantContextShowOverlay,
    unRegisterPromptContext,
  } = useAssistantContext();

  // proxy show / hide calls to assistant context, using our internal prompt context id:
  const showAssistantOverlay = useCallback(
    (showOverlay: boolean) => {
      assistantContextShowOverlay({
        showOverlay,
        promptContextId: _promptContextId,
        conversationId,
      });
    },
    [assistantContextShowOverlay, _promptContextId, conversationId]
  );

  useEffect(
    () => () => unRegisterPromptContext(_promptContextId),
    [_promptContextId, unRegisterPromptContext]
  );

  if (
    promptContext != null &&
    (_promptContextRef.current?.category !== promptContext?.category ||
      _promptContextRef.current?.description !== promptContext?.description ||
      _promptContextRef.current?.getPromptContext !== promptContext?.getPromptContext ||
      _promptContextRef.current?.suggestedUserPrompt !== promptContext?.suggestedUserPrompt ||
      _promptContextRef.current?.tooltip !== promptContext?.tooltip)
  ) {
    _promptContextRef.current = { ...promptContext, id: _promptContextId };
    registerPromptContext(_promptContextRef.current);
  }

  return { promptContextId: _promptContextId, showAssistantOverlay };
};
