/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
