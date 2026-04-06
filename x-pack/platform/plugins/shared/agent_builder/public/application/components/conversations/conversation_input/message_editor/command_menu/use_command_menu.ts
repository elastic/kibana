/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import type { CommandMatchResult } from './types';
import { matchCommand } from './command_matcher';
import { getTextBeforeCursor } from './utils/get_text_before_cursor';

interface CommandMenuState {
  /** Current command match result */
  readonly match: CommandMatchResult;
  /** Dismiss the current command (e.g., user presses Escape) */
  readonly dismiss: () => void;
  /** Handler to be called on input events */
  readonly checkInputForCommand: (element: HTMLElement) => void;
}

interface UseCommandMenuOptions {
  /** Whether command detection is enabled. Defaults to true. */
  readonly enabled?: boolean;
}

const INACTIVE_MATCH: CommandMatchResult = {
  isActive: false,
  activeCommand: null,
};

/**
 * Hook that detects command sequences in a contentEditable element.
 *
 * Used internally by useMessageEditor to track command state as the
 * user types. Check `match.isActive` to show/hide the command menu.
 */
export const useCommandMenu = (options: UseCommandMenuOptions = {}): CommandMenuState => {
  const { enabled = true } = options;

  const [match, setMatch] = useState<CommandMatchResult>(INACTIVE_MATCH);

  const checkInputForCommand = useCallback(
    (element: HTMLElement) => {
      if (!enabled) {
        setMatch((prev) => (prev.isActive ? INACTIVE_MATCH : prev));
        return;
      }
      const textBeforeCursor = getTextBeforeCursor(element);
      const nextMatch = matchCommand(textBeforeCursor);
      setMatch(nextMatch);
    },
    [enabled]
  );

  const dismiss = useCallback(() => {
    setMatch((m) => ({ ...m, isActive: false }));
  }, []);

  return { match, dismiss, checkInputForCommand };
};
