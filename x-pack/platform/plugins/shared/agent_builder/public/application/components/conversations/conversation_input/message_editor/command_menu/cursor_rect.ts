/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns a DOMRect for a character offset within a contentEditable element.
 * Walks text nodes via TreeWalker to find the correct node and offset,
 * then uses a collapsed Range to get the bounding rect.
 */
export const getRectAtOffset = (element: HTMLElement, offset: number): DOMRect | null => {
  // Filter for only text nodes
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let currentOffset = 0;
  let node: Node | null;

  node = walker.nextNode();
  while (node) {
    const length = (node as Text).length;
    if (currentOffset + length > offset) {
      const range = document.createRange();
      range.setStart(node, offset - currentOffset);
      range.collapse(true);
      return range.getBoundingClientRect();
    }
    currentOffset += length;
    node = walker.nextNode();
  }

  return null;
};
