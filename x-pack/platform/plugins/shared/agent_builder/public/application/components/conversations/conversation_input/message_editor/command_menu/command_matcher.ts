/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandMatchResult, ActiveCommand, CommandDefinition } from './types';

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
 * Given the text preceding the cursor, checks if any registered command
 * is active. Returns the command whose sequence appears closest to the cursor.
 *
 * The algorithm checks every registered command, finds the last word-boundary
 * occurrence of each sequence, and picks the one nearest to the cursor position.
 */
export const matchCommand = (
  textBeforeCursor: string,
  definitions: readonly CommandDefinition[]
): CommandMatchResult => {
  let best: ActiveCommand | null = null;

  for (const command of definitions) {
    const { sequence } = command;
    const lastIndex = textBeforeCursor.lastIndexOf(sequence);

    if (lastIndex === -1) {
      continue;
    }

    if (!isAtWordBoundary(textBeforeCursor, lastIndex)) {
      continue;
    }

    if (best === null || lastIndex > best.commandStartOffset) {
      best = {
        command,
        commandStartOffset: lastIndex,
        query: textBeforeCursor.substring(lastIndex + sequence.length),
      };
    }
  }

  if (best) {
    return { isActive: true, activeCommand: best };
  }

  return INACTIVE_RESULT;
};
