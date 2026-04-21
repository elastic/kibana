/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { ComposerInjection } from '../../types/composer';

export interface UseComposerInjectionResult {
  composerInjection: ComposerInjection | null;
  setComposerContent: (text: string) => void;
  acknowledgeComposerInjection: () => void;
}

/**
 * Shared state hook for the one-shot composer injection channel used by both
 * `RoutedConversationsProvider` and `EmbeddableConversationsProvider`.
 *
 * Semantics:
 * - `setComposerContent(text)` stores `{ key: prevKey + 1, text }`.
 *   The key increments on every call so `ConversationInput` re-runs its effect
 *   even if the same text is submitted twice in a row.
 * - `acknowledgeComposerInjection()` resets state to `null` once the editor
 *   has applied the injection.
 */
export const useComposerInjection = (): UseComposerInjectionResult => {
  const [composerInjection, setComposerInjection] = useState<ComposerInjection | null>(null);

  const setComposerContent = useCallback((text: string) => {
    setComposerInjection((prev) => ({
      key: (prev?.key ?? 0) + 1,
      text,
    }));
  }, []);

  const acknowledgeComposerInjection = useCallback(() => {
    setComposerInjection(null);
  }, []);

  return { composerInjection, setComposerContent, acknowledgeComposerInjection };
};
