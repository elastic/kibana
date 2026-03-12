/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import type { TriggerMatchResult } from './types';
import { matchTrigger, getTextBeforeCursor } from './trigger_matcher';

export interface InlineActionTriggerState {
  /** Current trigger match result */
  readonly match: TriggerMatchResult;
  /** Dismiss the current trigger (e.g., user presses Escape) */
  readonly dismiss: () => void;
  /** Handler to be called on input events */
  readonly handleInput: (element: HTMLElement) => void;
}

interface UseInlineActionTriggerOptions {
  /** Whether trigger detection is enabled. Defaults to true. */
  readonly enabled?: boolean;
}

const INACTIVE_MATCH: TriggerMatchResult = {
  isActive: false,
  activeTrigger: null,
};

/**
 * Hook that detects inline action triggers in a contentEditable element.
 *
 * Used internally by useMessageEditor to track trigger state as the
 * user types. Check `match.isActive` to show/hide the inline action dialog.
 */
export const useInlineActionTrigger = (
  options: UseInlineActionTriggerOptions = {}
): InlineActionTriggerState => {
  const { enabled = true } = options;

  const [match, setMatch] = useState<TriggerMatchResult>(INACTIVE_MATCH);

  const handleInput = useCallback(
    (element: HTMLElement) => {
      if (!enabled) {
        setMatch((prev) => (prev.isActive ? INACTIVE_MATCH : prev));
        return;
      }

      const textBeforeCursor = getTextBeforeCursor(element);
      setMatch(matchTrigger(textBeforeCursor));
    },
    [enabled]
  );

  const dismiss = useCallback(() => {
    setMatch(INACTIVE_MATCH);
  }, []);

  return { match, dismiss, handleInput };
};
