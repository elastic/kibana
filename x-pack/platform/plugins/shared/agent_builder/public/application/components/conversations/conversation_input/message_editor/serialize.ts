/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isElementCommandBadge, serializeCommandBadge } from './command_badge';
import {
  getPlaceholderKind,
  IMAGE_ATTACHMENT_SCHEME,
  isElementAttachmentPlaceholder,
  PDF_ATTACHMENT_SCHEME,
} from './attachment_placeholder';
import { stripZeroWidthSpaces } from './utils';

/**
 * Encodes an image filename for use as the path in a serialized image link.
 * Uses encodeURIComponent and additionally escapes parentheses to avoid
 * breaking the badge regex parser.
 */
export const encodeImageName = (name: string): string =>
  encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29');

/**
 * Walks child nodes of the editor element and serializes to text.
 * Badge spans are converted to `[/label](scheme://metadataValue)`.
 * Image and pdf placeholders are converted to `[name](image://encodedName)` and `[name](pdf://encodedName)`.
 * Text nodes are appended as-is, with caret-target ZWS characters stripped.
 */
export const serializeEditorContent = (editorElement: HTMLElement): string => {
  let result = '';

  for (const node of Array.from(editorElement.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += stripZeroWidthSpaces(node.textContent ?? '');
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      // skip
      continue;
    }
    const element = node as HTMLElement;
    if (isElementAttachmentPlaceholder(element)) {
      const name = element.getAttribute('aria-label') ?? '';
      const displayName = name.replace(/[\[\]]/g, '');
      const scheme =
        getPlaceholderKind(element) === 'pdf' ? PDF_ATTACHMENT_SCHEME : IMAGE_ATTACHMENT_SCHEME;
      result += `[${displayName}](${scheme}://${encodeImageName(name)})`;
    } else if (isElementCommandBadge(element)) {
      result += serializeCommandBadge(element);
    } else if (element.tagName === 'BR') {
      result += '\n';
    } else {
      // For any other elements, append their text content
      result += element.textContent ?? '';
    }
  }

  return result;
};
