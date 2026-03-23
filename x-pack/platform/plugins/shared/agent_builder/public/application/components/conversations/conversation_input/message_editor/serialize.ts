/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isElementCommandBadge, serializeCommandBadge } from './command_badge';

/**
 * Walks child nodes of the editor element and serializes to text.
 * Badge spans are converted to `[/label](scheme://metadataValue)`.
 * Text nodes are appended as-is.
 */
export const serializeEditorContent = (editorElement: HTMLElement): string => {
  let result = '';

  for (const node of Array.from(editorElement.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? '';
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      // skip
      continue;
    }
    const element = node as HTMLElement;
    if (isElementCommandBadge(element)) {
      result += serializeCommandBadge(element);
    } else {
      // For any other elements (e.g., <br>), append their text content
      result += element.textContent ?? '';
    }
  }

  return result;
};
