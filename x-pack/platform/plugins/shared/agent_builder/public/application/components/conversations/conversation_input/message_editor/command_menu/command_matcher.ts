/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandMatchResult, ActiveCommand, CommandDefinition, CommandId } from './types';

/**
 * Determines if the character at the given position is at a word boundary.
 * A word boundary is the start of the string or immediately after whitespace.
 */
const isAtWordBoundary = (text: string, offset: number): boolean => {
  if (offset === 0) {
    return true;
  }
  const precedingChar = text[offset - 1];
  return /\s/.test(precedingChar);
};

const INACTIVE_RESULT: CommandMatchResult = {
  isActive: false,
  activeCommand: null,
};

/**
 * Given the text preceding the cursor, checks if any registered command is
 * active.
 *
 * Every registered command is checked for its last word-boundary occurrence.
 * If a command is already active (`activeCommandId`) and it still has a
 * match, that command is kept active, even if another command's sequence
 * appears closer to the cursor — otherwise a trigger character typed as
 * plain text inside an in-progress command's query (e.g. "/" typed while
 * writing an "@" mention) would hijack the active command. Absent an active
 * command, the sequence closest to the cursor starts a new one.
 */
export const matchCommand = (
  textBeforeCursor: string,
  definitions: readonly CommandDefinition[],
  activeCommandId?: CommandId
): CommandMatchResult => {
  let best: ActiveCommand | null = null;
  let active: ActiveCommand | null = null;

  for (const command of definitions) {
    const { sequence } = command;
    const lastIndex = textBeforeCursor.lastIndexOf(sequence);

    if (lastIndex === -1) {
      continue;
    }

    if (!isAtWordBoundary(textBeforeCursor, lastIndex)) {
      continue;
    }

    const candidate: ActiveCommand = {
      command,
      commandStartOffset: lastIndex,
      query: textBeforeCursor.substring(lastIndex + sequence.length),
    };

    if (command.id === activeCommandId) {
      active = candidate;
    }

    if (best === null || lastIndex > best.commandStartOffset) {
      best = candidate;
    }
  }

  const result = active ?? best;

  if (result) {
    return { isActive: true, activeCommand: result };
  }

  return INACTIVE_RESULT;
};
