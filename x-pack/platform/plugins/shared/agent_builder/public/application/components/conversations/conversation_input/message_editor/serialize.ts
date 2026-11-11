/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isElementCommandBadge, serializeCommandBadge } from './command_badge';
import {
  ATTACHMENT_ID_PARAM,
  getPlaceholderKind,
  isElementAttachmentPlaceholder,
} from './attachment_placeholder';
import { stripZeroWidthSpaces } from './utils';

/**
 * Encodes an attachment file name for use as the path in a serialized attachment link.
 * Uses encodeURIComponent and additionally escapes parentheses to avoid
 * breaking the badge regex parser.
 */
export const encodeAttachmentName = (name: string): string =>
  encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29');

/**
 * Walks child nodes of the editor element and serializes to text.
 * Badge spans are converted to `[/label](scheme://metadataValue)`.
 * Image, binary and text file placeholders are converted to `[name](image://encodedName)`, `[name](binary://encodedName)` and `[name](text://encodedName)`.
 * A placeholder that knows its attachment id adds it as `?id=<encodedId>`, so the sent message links to the attachment.
 * Text nodes are appended as-is, with caret-target ZWS characters stripped.
 * A trailing <br> is skipped: the browser adds it to keep the last line visible, it is not content.
 */
export const serializeEditorContent = (editorElement: HTMLElement): string => {
  let result = '';
  const childNodes = Array.from(editorElement.childNodes);
  // Empty text nodes add nothing, so the browser may leave one after its trailing <br>
  const lastContentNode = [...childNodes]
    .reverse()
    .find(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || stripZeroWidthSpaces(node.textContent ?? '') !== ''
    );

  for (const node of childNodes) {
    if (node === lastContentNode && node.nodeName === 'BR') {
      continue;
    }
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
      const scheme = getPlaceholderKind(element);
      const { attachmentId } = element.dataset;
      const query = attachmentId
        ? `?${ATTACHMENT_ID_PARAM}=${encodeAttachmentName(attachmentId)}`
        : '';
      result += `[${displayName}](${scheme}://${encodeAttachmentName(name)}${query})`;
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
