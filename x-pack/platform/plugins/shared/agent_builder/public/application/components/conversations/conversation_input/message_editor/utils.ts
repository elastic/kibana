/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { charOffsetToDomPosition } from './command_badge';
import type { ActiveCommand } from './command_menu';

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
