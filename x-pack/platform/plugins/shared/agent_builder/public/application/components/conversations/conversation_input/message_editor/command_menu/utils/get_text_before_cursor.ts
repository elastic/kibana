/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMMAND_BADGE_ATTRIBUTE } from '../../command_badge/attributes';
import { sortedCommandDefinitions } from '../command_definitions';

const isInsideCommandBadge = (node: Node): boolean => {
  let current = node.parentElement;
  while (current) {
    if (current.hasAttribute(COMMAND_BADGE_ATTRIBUTE)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
};

/**
 * Replaces command sequence characters within a string with spaces.
 * For example, if "/" is a command sequence, "/Summarize" becomes " Summarize".
 * This preserves the string length so character offsets remain valid.
 */
const sanitizeCommandSequences = (text: string): string => {
  let result = text;
  for (const { sequence } of sortedCommandDefinitions) {
    if (result.startsWith(sequence)) {
      result = ' '.repeat(sequence.length) + result.slice(sequence.length);
    }
  }
  return result;
};

/**
 * Extracts the text before the cursor from a contentEditable element.
 *
 * Command sequences inside badge elements are replaced with spaces so
 * they are not picked up by command matching logic, while preserving the
 * text length for correct character offset calculations.
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

  const fragment = preCaretRange.cloneContents();
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);

  let text = '';
  let node = walker.nextNode();
  while (node) {
    const nodeText = node.textContent ?? '';
    text += isInsideCommandBadge(node) ? sanitizeCommandSequences(nodeText) : nodeText;
    node = walker.nextNode();
  }

  return text;
};
