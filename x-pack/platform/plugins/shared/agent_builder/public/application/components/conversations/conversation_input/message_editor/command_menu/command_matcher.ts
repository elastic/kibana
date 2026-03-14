/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortedCommandDefinitions } from './command_definitions';
import type { CommandMatchResult, ActiveCommand } from './types';

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
 * is active. Returns the first (longest) matching command.
 *
 * The algorithm scans backward from the cursor position to find the nearest
 * command sequence. For each registered command (sorted longest-first), it:
 * 1. Finds the last occurrence of the sequence in the text
 * 2. Checks that the sequence starts at a word boundary
 */
export const matchCommand = (textBeforeCursor: string): CommandMatchResult => {
  for (const command of sortedCommandDefinitions) {
    const { sequence } = command;
    const lastIndex = textBeforeCursor.lastIndexOf(sequence);

    if (lastIndex === -1) {
      continue;
    }

    if (!isAtWordBoundary(textBeforeCursor, lastIndex)) {
      continue;
    }

    const afterCommand = textBeforeCursor.substring(lastIndex + sequence.length);

    const activeCommand: ActiveCommand = {
      command,
      commandStartOffset: lastIndex,
      query: afterCommand,
    };

    return {
      isActive: true,
      activeCommand,
    };
  }

  return INACTIVE_RESULT;
};

/**
 * Extracts the text before the cursor from a contentEditable element.
 *
 * Uses the Selection/Range API to determine the cursor position within
 * the element's text content and returns the substring from the start
 * to the cursor.
 */
export const getTextBeforeCursor = (element: HTMLElement): string => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return '';
  }

  const range = selection.getRangeAt(0);

  if (!element.contains(range.startContainer)) {
    return '';
  }

  const preCaretRange = document.createRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.startContainer, range.startOffset);

  return preCaretRange.toString();
};
