/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import type { CommandMatchResult } from './types';
import { matchCommand } from './command_matcher';
import { useAvailableCommandDefinitions } from './command_definitions';
import { getTextBeforeCursor } from './utils/get_text_before_cursor';

interface CommandMenuState {
  /** Current command match result */
  readonly match: CommandMatchResult;
  /** Dismiss the current command (e.g., user presses Escape) */
  readonly dismiss: () => void;
  /** Handler to be called on input events */
  readonly checkInputForCommand: (element: HTMLElement) => void;
  /** Reports whether the active command's mounted menu has anything to show */
  readonly reportContent: (hasVisibleContent: boolean) => void;
}

interface UseCommandMenuOptions {
  /** Whether command detection is enabled. Defaults to true. */
  readonly enabled?: boolean;
}

const INACTIVE_MATCH: CommandMatchResult = {
  isActive: false,
  activeCommand: null,
  hasVisibleContent: true,
};

/**
 * Hook that detects command sequences in a contentEditable element.
 *
 * Used internally by useMessageEditor to track command state as the
 * user types. Check `match.isActive` to show/hide the command menu.
 */
export const useCommandMenu = (options: UseCommandMenuOptions = {}): CommandMenuState => {
  const { enabled = true } = options;
  const definitions = useAvailableCommandDefinitions();

  const [match, setMatch] = useState<CommandMatchResult>(INACTIVE_MATCH);

  const checkInputForCommand = useCallback(
    (element: HTMLElement) => {
      if (!enabled) {
        setMatch((prev) => (prev.isActive ? INACTIVE_MATCH : prev));
        return;
      }
      const textBeforeCursor = getTextBeforeCursor(element);
      setMatch((prev) => {
        // Only stay sticky to the active command while there is a hope of a match
        const stickyCommandId =
          prev.isActive && prev.hasVisibleContent ? prev.activeCommand?.command.id : undefined;
        const result = matchCommand(textBeforeCursor, definitions, stickyCommandId);

        if (!result.isActive || !result.activeCommand) {
          return INACTIVE_MATCH;
        }

        const isSameMention =
          prev.isActive &&
          prev.activeCommand?.command.id === result.activeCommand.command.id &&
          prev.activeCommand?.commandStartOffset === result.activeCommand.commandStartOffset;

        return {
          ...result,
          // Carry over the known content status for the same mention;
          // assume content for a genuinely new one until it reports in.
          hasVisibleContent: isSameMention ? prev.hasVisibleContent : true,
        };
      });
    },
    [enabled, definitions]
  );

  const dismiss = useCallback(() => {
    setMatch((m) => ({ ...m, isActive: false }));
  }, []);

  const reportContent = useCallback((hasVisibleContent: boolean) => {
    setMatch((prev) => (prev.isActive ? { ...prev, hasVisibleContent } : prev));
  }, []);

  return { match, dismiss, checkInputForCommand, reportContent };
};
