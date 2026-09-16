/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useMemo } from 'react';
import type { CommandMatchResult, TextMatch } from './types';
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
  /** Reports whether the active command's mounted menu has anything to show, for a given query */
  readonly reportContent: (hasVisibleContent: boolean, forQuery: string) => void;
}

interface UseCommandMenuOptions {
  /** Whether command detection is enabled. Defaults to true. */
  readonly enabled?: boolean;
}

const INACTIVE_MATCH: TextMatch = {
  isActive: false,
  activeCommand: null,
};

interface ConfirmedContent {
  readonly query: string;
  readonly hasVisibleContent: boolean;
}

/**
 * Hook that detects command sequences in a contentEditable element.
 *
 * Used internally by useMessageEditor to track command state as the
 * user types. Check `match.isActive` to show/hide the command menu.
 */
export const useCommandMenu = (options: UseCommandMenuOptions = {}): CommandMenuState => {
  const { enabled = true } = options;
  const definitions = useAvailableCommandDefinitions();

  const [textMatch, setTextMatch] = useState<TextMatch>(INACTIVE_MATCH);
  const [confirmedContent, setConfirmedContent] = useState<ConfirmedContent | null>(null);

  const checkInputForCommand = useCallback(
    (element: HTMLElement) => {
      if (!enabled) {
        setTextMatch((prev) => (prev.isActive ? INACTIVE_MATCH : prev));
        return;
      }
      const textBeforeCursor = getTextBeforeCursor(element);
      setTextMatch(matchCommand(textBeforeCursor, definitions));
    },
    [enabled, definitions]
  );

  const dismiss = useCallback(() => {
    setTextMatch((prev) => ({ ...prev, isActive: false }));
  }, []);

  const reportContent = useCallback((hasVisibleContent: boolean, forQuery: string) => {
    setConfirmedContent({ query: forQuery, hasVisibleContent });
  }, []);

  const match: CommandMatchResult = useMemo(() => {
    const { activeCommand } = textMatch;
    if (!activeCommand || !activeCommand.query.includes(' ')) {
      return { ...textMatch, hasVisibleContent: true };
    }
    const hasVisibleContent =
      confirmedContent?.query === activeCommand.query ? confirmedContent.hasVisibleContent : false;
    return { ...textMatch, hasVisibleContent };
  }, [textMatch, confirmedContent]);

  return { match, dismiss, checkInputForCommand, reportContent };
};
