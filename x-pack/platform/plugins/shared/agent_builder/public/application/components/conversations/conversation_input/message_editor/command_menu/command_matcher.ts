/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TextMatch, ActiveCommand, CommandDefinition } from './types';

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

const INACTIVE_RESULT: TextMatch = {
  isActive: false,
  activeCommand: null,
};

/**
 * Given the text preceding the cursor, finds the command whose trigger
 * sequence (e.g. "@", "/") is closest to the cursor at a word boundary.
 *
 * A sequence inside another command's query (e.g. the "/" in
 * "@connector/workday") is never a word boundary, so it's never mistaken
 * for a new trigger — no extra bookkeeping needed for that case.
 */
export const matchCommand = (
  textBeforeCursor: string,
  definitions: readonly CommandDefinition[]
): TextMatch => {
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
