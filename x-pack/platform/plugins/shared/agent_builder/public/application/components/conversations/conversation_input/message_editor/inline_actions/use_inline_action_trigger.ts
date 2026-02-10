/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type { TriggerDefinition, TriggerMatchResult } from './types';
import { matchTrigger, getTextBeforeCursor } from './trigger_matcher';
import { createTriggerRegistry } from './trigger_registry';

export interface InlineActionTriggerState {
  /** Current trigger match result */
  readonly match: TriggerMatchResult;
  /** Dismiss the current trigger (e.g., user presses Escape) */
  readonly dismiss: () => void;
  /** Handler to be called on input events */
  readonly handleInput: (element: HTMLElement) => void;
}

interface UseInlineActionTriggerOptions {
  /** Custom trigger definitions. Uses defaults if not provided. */
  readonly triggers?: readonly TriggerDefinition[];
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
  const { triggers: customTriggers, enabled = true } = options;

  const registry = useMemo(() => createTriggerRegistry(customTriggers), [customTriggers]);

  const [match, setMatch] = useState<TriggerMatchResult>(INACTIVE_MATCH);

  // Track which trigger the user manually dismissed.
  // Reset when the trigger context changes or goes inactive.
  const dismissedTriggerIdRef = useRef<string | null>(null);

  const handleInput = useCallback(
    (element: HTMLElement) => {
      if (!enabled) {
        setMatch((prev) => (prev.isActive ? INACTIVE_MATCH : prev));
        return;
      }

      const textBeforeCursor = getTextBeforeCursor(element);
      const result = matchTrigger(textBeforeCursor, registry);

      // If the user previously dismissed this trigger and hasn't
      // changed the trigger context, keep it dismissed
      if (
        result.isActive &&
        result.activeTrigger &&
        dismissedTriggerIdRef.current === result.activeTrigger.trigger.id
      ) {
        return;
      }

      // If the trigger changed or went inactive, clear the dismissed state
      if (
        !result.isActive ||
        (result.activeTrigger &&
          dismissedTriggerIdRef.current !== null &&
          dismissedTriggerIdRef.current !== result.activeTrigger.trigger.id)
      ) {
        dismissedTriggerIdRef.current = null;
      }

      setMatch(result);
    },
    [enabled, registry]
  );

  const dismiss = useCallback(() => {
    if (match.isActive && match.activeTrigger) {
      dismissedTriggerIdRef.current = match.activeTrigger.trigger.id;
      setMatch(INACTIVE_MATCH);
    }
  }, [match]);

  return { match, dismiss, handleInput };
};
