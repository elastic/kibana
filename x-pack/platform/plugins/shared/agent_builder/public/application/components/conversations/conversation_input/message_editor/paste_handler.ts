/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RefObject } from 'react';
import DOMPurify from 'dompurify';
import { SUPPORTED_PDF_MIME_TYPE } from '@kbn/agent-builder-common/attachments';
import {
  COMMAND_BADGE_ATTRIBUTE,
  COMMAND_BADGE_LABEL_ATTRIBUTE,
  COMMAND_ID_ATTRIBUTE,
  isElementCommandBadge,
} from './command_badge';
import { COMMAND_METADATA_ATTRIBUTE } from './command_badge/attributes';
import { insertImagePlaceholderChip, type PlaceholderKind } from './image_placeholder';
import { createTextFragment, ensureCaretTargetBeforeFirstBadge, insertNodeAtCursor } from './utils';

const stringContainsBadge = (html: string): boolean => html.includes(COMMAND_BADGE_ATTRIBUTE);

/**
 * Removes all pasted markup except the elements and attributes used by command badges.
 */
const sanitizePastedHtml = (html: string): DocumentFragment => {
  return DOMPurify.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    ALLOWED_TAGS: ['span', 'br'],
    ALLOWED_ATTR: [
      COMMAND_BADGE_ATTRIBUTE,
      COMMAND_BADGE_LABEL_ATTRIBUTE,
      COMMAND_ID_ATTRIBUTE,
      COMMAND_METADATA_ATTRIBUTE,
      'contenteditable',
      'aria-label',
      'title',
    ],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
  });
};

const createTextAndBadgeFragment = (sanitizedHtml: DocumentFragment): DocumentFragment => {
  const fragment = document.createDocumentFragment();

  for (const node of Array.from(sanitizedHtml.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      fragment.appendChild(document.createTextNode(node.textContent ?? ''));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (isElementCommandBadge(element)) {
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
  acceptPdf?: boolean;
  editorRef: RefObject<HTMLDivElement>;
  onChange: () => void;
  onAfterInput?: () => void;
}

const getPastedFileKind = (type: string, acceptPdf: boolean): PlaceholderKind | undefined => {
  if (type.startsWith('image/')) return 'image';
  if (acceptPdf && type === SUPPORTED_PDF_MIME_TYPE) return 'pdf';
  return undefined;
};

/** Handles the image and pdf file branch of a paste event. Returns true if consumed. */
const handleFilePaste = (event: ClipboardEvent, opts: HandleEditorPasteOpts): boolean => {
  const { onPasteFile, acceptPdf = false, onChange } = opts;
  if (!onPasteFile || !event.clipboardData) return false;

  const fileItem = Array.from(event.clipboardData.items).find(
    (item) => item.kind === 'file' && getPastedFileKind(item.type, acceptPdf)
  );
  if (!fileItem) return false;

  event.preventDefault();
  const file = fileItem.getAsFile();
  const kind = getPastedFileKind(fileItem.type, acceptPdf);
  if (file && kind) {
    const label = onPasteFile(file);
    if (label) {
      insertImagePlaceholderChip(label, kind);
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
    ? createTextAndBadgeFragment(sanitizePastedHtml(htmlData))
    : createTextFragment(textData);

  insertNodeAtCursor(node);
  if (editorRef.current) {
    ensureCaretTargetBeforeFirstBadge(editorRef.current);
  }

  onChange();
};

/**
 * Full paste handler for the message editor contentEditable.
 * Dispatches to image/pdf-file paste or text/badge paste based on clipboard content.
 */
export const handleEditorPaste = (event: ClipboardEvent, opts: HandleEditorPasteOpts): void => {
  const handledAsFile = handleFilePaste(event, opts);
  if (!handledAsFile) {
    handleTextOrBadgePaste(event, opts);
  }
  opts.onAfterInput?.(); // to sync with the pills
};
