/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RefObject } from 'react';
import { COMMAND_BADGE_ATTRIBUTE, isElementCommandBadge } from './command_badge';
import { createImagePlaceholderElement } from './image_placeholder';
import {
  createTextFragment,
  ensureCaretTargetBeforeFirstBadge,
  insertNodeAtCursor,
  insertSpaceAfter,
  placeCursorAfter,
} from './utils';

const stringContainsBadge = (html: string): boolean => html.includes(COMMAND_BADGE_ATTRIBUTE);

/**
 * Sanitizes pasted HTML to only allow badge spans.
 * Uses DOMParser to safely parse HTML, then walks its children,
 * keeping only badge spans, <br> elements, and text nodes.
 */
const sanitizeHtmlIncludeOnlyTextAndBadges = (html: string): DocumentFragment => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const fragment = document.createDocumentFragment();

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      fragment.appendChild(document.createTextNode(node.textContent ?? ''));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (isElementCommandBadge(element)) {
        // Clone the badge span
        fragment.appendChild(element.cloneNode(true));
      } else if (element.tagName === 'BR') {
        fragment.appendChild(document.createElement('br'));
      } else {
        // Strip other HTML, keep text content
        fragment.appendChild(document.createTextNode(element.textContent ?? ''));
      }
    }
  }

  return fragment;
};

export interface HandleEditorPasteOpts {
  onPasteFile?: (file: File) => string | undefined;
  insertImagePlaceholderOnPaste: boolean;
  editorRef: RefObject<HTMLDivElement>;
  onChange: () => void;
}

/** Handles the image-file branch of a paste event. Returns true if consumed. */
const handleImageFilePaste = (event: ClipboardEvent, opts: HandleEditorPasteOpts): boolean => {
  const { onPasteFile, insertImagePlaceholderOnPaste, onChange } = opts;
  if (!onPasteFile || !event.clipboardData) return false;

  const imageItem = Array.from(event.clipboardData.items).find(
    (item) => item.kind === 'file' && item.type.startsWith('image/')
  );
  if (!imageItem) return false;

  event.preventDefault();
  const file = imageItem.getAsFile();
  if (file) {
    const label = onPasteFile(file);
    if (insertImagePlaceholderOnPaste && label) {
      const chipEl = createImagePlaceholderElement(label);
      // Mark uploading immediately; the useEffect will clear it once upload finishes.
      chipEl.setAttribute('data-uploading', 'true');
      insertNodeAtCursor(chipEl);
      const sel = window.getSelection();
      if (sel) {
        const space = insertSpaceAfter(chipEl);
        if (space) {
          placeCursorAfter(space, sel);
        }
      }
      onChange();
    }
  }
  return true;
};

/** Handles the text/HTML fallback branch of a paste event. */
const handleTextOrBadgePaste = (event: ClipboardEvent, opts: HandleEditorPasteOpts): void => {
  const { editorRef, onChange } = opts;
  if (!event.clipboardData) return;

  event.preventDefault();

  const htmlData = event.clipboardData.getData('text/html');
  const textData = event.clipboardData.getData('text/plain');

  const hasBadgeHtml = htmlData && stringContainsBadge(htmlData);
  const node = hasBadgeHtml
    ? sanitizeHtmlIncludeOnlyTextAndBadges(htmlData)
    : createTextFragment(textData);

  insertNodeAtCursor(node);
  if (editorRef.current) {
    ensureCaretTargetBeforeFirstBadge(editorRef.current);
  }

  onChange();
};

/**
 * Full paste handler for the message editor contentEditable.
 * Dispatches to image-file paste or text/badge paste based on clipboard content.
 */
export const handleEditorPaste = (event: ClipboardEvent, opts: HandleEditorPasteOpts): void => {
  if (handleImageFilePaste(event, opts)) return;
  handleTextOrBadgePaste(event, opts);
};
