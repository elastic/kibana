/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isElementCommandBadge } from './create_badge_element';

interface DomPosition {
  node: Node;
  offset: number;
}

const isElement = (node: Node): node is HTMLElement => node.nodeType === Node.ELEMENT_NODE;

/**
 * Converts a character offset within a container to a DOM node + offset pair.
 *
 * Walks the container's direct children, accumulating character lengths, to find
 * which child node contains the target offset. For text nodes, returns the
 * intra-node character position. For badge elements (which are atomic and
 * non-editable), returns a parent-relative position before the badge.
 */
export const charOffsetToDomPosition = (
  container: HTMLElement,
  charOffset: number
): DomPosition => {
  const children = Array.from(container.childNodes);
  let currentOffset = 0;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const length = (child.textContent ?? '').length;
    const isBadge = isElement(child) && isElementCommandBadge(child);
    let childEndOffset = currentOffset + length;
    if (isBadge) {
      // Badges are atomic — an offset at the badge's end boundary means "after the badge",
      // not "inside it". Shrinking the end by 1 makes the >= check exclude that boundary,
      // so the offset falls through to the next child instead.
      childEndOffset -= 1;
    }
    const isCharOffsetWithinChild = childEndOffset >= charOffset;

    if (isCharOffsetWithinChild) {
      // Badge elements are atomic — return a parent-relative position before the badge
      if (isElement(child) && isElementCommandBadge(child)) {
        return { node: container, offset: i };
      }

      // Text nodes and other elements — return intra-node character position
      return { node: child, offset: charOffset - currentOffset };
    }

    currentOffset += length;
  }

  return { node: container, offset: children.length };
};
