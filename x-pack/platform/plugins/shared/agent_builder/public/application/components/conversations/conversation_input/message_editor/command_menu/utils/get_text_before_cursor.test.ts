/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTextBeforeCursor } from './get_text_before_cursor';

describe('getTextBeforeCursor', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.contentEditable = 'plaintext-only';
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('returns empty string when no selection', () => {
    element.textContent = 'hello';
    window.getSelection()?.removeAllRanges();
    expect(getTextBeforeCursor(element)).toBe('');
  });

  it('returns empty string when selection is outside element', () => {
    element.textContent = 'hello';
    const otherElement = document.createElement('div');
    otherElement.textContent = 'other';
    document.body.appendChild(otherElement);

    const range = document.createRange();
    range.setStart(otherElement.firstChild!, 0);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    expect(getTextBeforeCursor(element)).toBe('');
    document.body.removeChild(otherElement);
  });

  it('returns text before cursor in simple text node', () => {
    element.textContent = 'hello world';
    const textNode = element.firstChild!;

    const range = document.createRange();
    range.setStart(textNode, 5);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    expect(getTextBeforeCursor(element)).toBe('hello');
  });

  it('returns full text when cursor is at end', () => {
    element.textContent = 'hello';
    const textNode = element.firstChild!;

    const range = document.createRange();
    range.setStart(textNode, 5);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    expect(getTextBeforeCursor(element)).toBe('hello');
  });

  it('returns empty string when cursor is at start', () => {
    element.textContent = 'hello';
    const textNode = element.firstChild!;

    const range = document.createRange();
    range.setStart(textNode, 0);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    expect(getTextBeforeCursor(element)).toBe('');
  });

  it('returns empty string for element with no text content', () => {
    const range = document.createRange();
    range.setStart(element, 0);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    expect(getTextBeforeCursor(element)).toBe('');
  });
});
