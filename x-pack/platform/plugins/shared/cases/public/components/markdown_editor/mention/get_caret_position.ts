/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CaretPosition {
  top: number;
  left: number;
  height: number;
}

const MIRRORED_STYLES = [
  'boxSizing',
  'width',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'lineHeight',
  'textTransform',
  'wordSpacing',
  'tabSize',
] as const;

/**
 * Returns the caret position at `index`, relative to `container`.
 * Textareas expose no caret geometry, so the text is laid out in a hidden mirror element.
 */
export const getCaretPosition = (
  textarea: HTMLTextAreaElement,
  index: number,
  container: HTMLElement
): CaretPosition => {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');

  MIRRORED_STYLES.forEach((property) => {
    mirror.style[property] = style[property];
  });
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.top = '0';
  mirror.style.left = '-9999px';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.overflow = 'hidden';

  mirror.textContent = textarea.value.slice(0, index);
  const marker = document.createElement('span');
  marker.textContent = textarea.value.slice(index) || '.';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const markerTop = marker.offsetTop;
  const markerLeft = marker.offsetLeft;
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
  document.body.removeChild(mirror);

  const textareaRect = textarea.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return {
    top: textareaRect.top - containerRect.top + markerTop - textarea.scrollTop,
    left: textareaRect.left - containerRect.left + markerLeft - textarea.scrollLeft,
    height: lineHeight,
  };
};
