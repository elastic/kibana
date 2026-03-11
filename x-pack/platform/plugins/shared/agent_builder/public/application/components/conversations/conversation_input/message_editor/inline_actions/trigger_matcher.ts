/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TriggerDefinition, TriggerMatchResult, ActiveTrigger } from './types';
// import { TriggerId } from './types';

// TODO: Re-enable trigger definitions
const TRIGGER_DEFINITIONS: readonly TriggerDefinition[] = [
  // { id: TriggerId.Attachment, sequence: '@' },
  // { id: TriggerId.Prompt, sequence: '/p' },
];

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

const INACTIVE_RESULT: TriggerMatchResult = {
  isActive: false,
  activeTrigger: null,
};

/**
 * Creates a trigger matcher function bound to the given trigger definitions.
 * Triggers are sorted longest-first for greedy matching at creation time.
 *
 * Given the text preceding the cursor, the returned function checks if any
 * registered trigger is active, returning the first (longest) matching trigger.
 *
 * The algorithm scans backward from the cursor position to find the nearest
 * trigger sequence. For each registered trigger (sorted longest-first), it:
 * 1. Finds the last occurrence of the sequence in the text
 * 2. Checks that the sequence starts at a word boundary
 */
export const createMatchTrigger = (
  triggers: readonly TriggerDefinition[] = TRIGGER_DEFINITIONS
) => {
  const sortedTriggers = [...triggers].sort((a, b) => b.sequence.length - a.sequence.length);

  return (textBeforeCursor: string): TriggerMatchResult => {
    for (const trigger of sortedTriggers) {
      const { sequence } = trigger;
      const lastIndex = textBeforeCursor.lastIndexOf(sequence);

      if (lastIndex === -1) {
        continue;
      }

      if (!isAtWordBoundary(textBeforeCursor, lastIndex)) {
        continue;
      }

      const afterTrigger = textBeforeCursor.substring(lastIndex + sequence.length);

      const activeTrigger: ActiveTrigger = {
        trigger,
        triggerStartOffset: lastIndex,
        query: afterTrigger,
      };

      return {
        isActive: true,
        activeTrigger,
      };
    }

    return INACTIVE_RESULT;
  };
};

export const matchTrigger = createMatchTrigger();

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
