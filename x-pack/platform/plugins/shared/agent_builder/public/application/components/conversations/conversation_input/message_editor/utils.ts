/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { charOffsetToDomPosition, isElementCommandBadge } from './command_badge';
import type { ActiveCommand } from './command_menu';

/**
 * Browsers cannot place a caret before a non-editable element (`contentEditable="false"`)
 * that is the first child of a contentEditable container.
 * A zero-width space provides an invisible caret target without affecting layout.
 */
export const ZERO_WIDTH_SPACE = '\u200B';

/**
 * Converts a plain text string into a DocumentFragment, preserving line breaks
 * as <br> elements. Text nodes alone cannot render \n in a contenteditable div.
 */
export const createTextFragment = (text: string): DocumentFragment => {
  const fragment = document.createDocumentFragment();
  const parts = text.split('\n');
  parts.forEach((part, i) => {
    if (part) {
      fragment.appendChild(document.createTextNode(part));
    }
    if (i < parts.length - 1) {
      fragment.appendChild(document.createElement('br'));
    }
  });
  return fragment;
};

/**
 * Creates a DOM Range spanning the full command text (sequence + query)
 * within the editor, e.g. the range covering "/summ" in "hello /summ".
 */
export const createCommandRange = (
  messageEditorElement: HTMLElement,
  activeCommand: ActiveCommand
): Range => {
  const { commandStartOffset, query, command } = activeCommand;
  const startPos = charOffsetToDomPosition(messageEditorElement, commandStartOffset);
  const endOffset = commandStartOffset + command.sequence.length + query.length;
  const endPos = charOffsetToDomPosition(messageEditorElement, endOffset);

  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  return range;
};

/**
 * Inserts a non-breaking space text node immediately after `node` within `container`.
 * Uses NBSP (\u00A0) because browsers collapse trailing regular spaces in contenteditable.
 */
export const insertSpaceAfter = (node: Node, container: HTMLElement): Text => {
  const space = document.createTextNode('\u00A0');
  container.insertBefore(space, node.nextSibling);
  return space;
};

/**
 * Collapses the selection to a cursor position immediately after `node`.
 */
export const placeCursorAfter = (node: Node, sel: Selection): void => {
  const range = document.createRange();
  if (node instanceof Text) {
    /**
     * (Firefox bug) For text nodes, collapse inside the node at the end of its data. That avoids
     * a parent-boundary range when a sibling empty text node follows (common after
     * Range mutations), which can paint the caret at the wrong horizontal position.
     * */
    range.setStart(node, node.length);
  } else {
    range.setStartAfter(node);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

export const placeCursorAtEnd = (editorElement: HTMLDivElement) => {
  const selection = window.getSelection();
  if (selection && editorElement.childNodes.length > 0) {
    const lastChild = editorElement.lastChild;
    if (lastChild) {
      const newRange = document.createRange();
      newRange.setStartAfter(lastChild);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }
};

/**
 * Returns the current selection's first Range, or undefined if there is no selection.
 */
export const getSelectionRange = (): Range | undefined => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return;
  }
  return sel.getRangeAt(0);
};

/**
 * Replaces the current selection with `node` and places the cursor after it.
 * Used by paste handling to insert content at the caret position.
 */
export const insertNodeAtCursor = (node: Node): void => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return;
  }
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
};

/**
 * Ensures the browser can place a caret before the first child when it is a
 * non-editable command badge. Inserts a zero-width space text node if needed.
 *
 * Also cleans up browser-inserted artifacts (`<br>`, empty text nodes) that
 * appear before a leading badge after the user deletes text — browsers add
 * these to preserve cursor position in contentEditable.
 *
 * @returns `true` if the DOM was modified (callers may need to restore cursor position).
 */
export const ensureCaretTargetBeforeFirstBadge = (container: HTMLElement): boolean => {
  let node = container.firstChild;
  const nodesToRemove: Node[] = [];

  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE && isElementCommandBadge(node as HTMLElement)) {
      for (const n of nodesToRemove) {
        container.removeChild(n);
      }
      container.insertBefore(document.createTextNode(ZERO_WIDTH_SPACE), node);
      return true;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (text.includes(ZERO_WIDTH_SPACE)) return false;
      if (stripZeroWidthSpaces(text).length > 0) return false;
      nodesToRemove.push(node);
    } else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
      nodesToRemove.push(node);
    } else {
      return false;
    }

    node = node.nextSibling;
  }

  return false;
};

/**
 * Strips zero-width space characters used as caret targets.
 */
export const stripZeroWidthSpaces = (text: string): string => {
  return text.replaceAll(ZERO_WIDTH_SPACE, '');
};
