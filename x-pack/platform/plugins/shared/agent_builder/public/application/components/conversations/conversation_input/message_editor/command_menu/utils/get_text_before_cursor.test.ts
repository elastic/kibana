/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMMAND_BADGE_ATTRIBUTE } from '../../command_badge/attributes';
import { getTextBeforeCursor } from './get_text_before_cursor';

const createBadge = (text: string): HTMLSpanElement => {
  const badge = document.createElement('span');
  badge.setAttribute(COMMAND_BADGE_ATTRIBUTE, 'true');
  badge.textContent = text;
  return badge;
};

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

  it('sanitizes command sequences inside badge text', () => {
    element.appendChild(createBadge('/Summarize'));
    element.appendChild(document.createTextNode('\u00A0'));

    const textAfter = document.createTextNode('hello');
    element.appendChild(textAfter);

    const range = document.createRange();
    range.setStart(textAfter, 5);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    const result = getTextBeforeCursor(element);
    expect(result).toBe(' Summarize\u00A0hello');
    expect(result).not.toContain('/');
  });

  it('preserves text length when sanitizing badge sequences', () => {
    element.appendChild(createBadge('/Summarize'));
    element.appendChild(document.createTextNode('\u00A0'));

    const textAfter = document.createTextNode('hello');
    element.appendChild(textAfter);

    const range = document.createRange();
    range.setStart(textAfter, 5);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    const result = getTextBeforeCursor(element);
    // '/Summarize' + NBSP + 'hello' = 10 + 1 + 5 = 16
    expect(result.length).toBe(16);
  });

  it('sanitizes multiple badges', () => {
    element.appendChild(createBadge('/Summarize'));
    element.appendChild(document.createTextNode('\u00A0'));
    element.appendChild(createBadge('/Translate'));
    element.appendChild(document.createTextNode('\u00A0'));

    const textAfter = document.createTextNode('hello');
    element.appendChild(textAfter);

    const range = document.createRange();
    range.setStart(textAfter, 5);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    const result = getTextBeforeCursor(element);
    expect(result).toBe(' Summarize\u00A0 Translate\u00A0hello');
    expect(result).not.toContain('/');
  });

  it('does not sanitize "/" in regular text nodes', () => {
    const textBefore = document.createTextNode('before /');
    element.appendChild(textBefore);

    const range = document.createRange();
    range.setStart(textBefore, 8);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    expect(getTextBeforeCursor(element)).toBe('before /');
  });

  it('includes text before and after a badge', () => {
    element.appendChild(document.createTextNode('before '));
    element.appendChild(createBadge('/Summarize'));
    const textAfter = document.createTextNode(' after');
    element.appendChild(textAfter);

    const range = document.createRange();
    range.setStart(textAfter, 6);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    const result = getTextBeforeCursor(element);
    expect(result).toBe('before  Summarize after');
    expect(result).not.toContain('/');
  });
});
