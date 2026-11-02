/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRectAtOffset } from './cursor_rect';

const mockDOMRect = {
  x: 10,
  y: 20,
  width: 0,
  height: 0,
  top: 20,
  right: 10,
  bottom: 20,
  left: 10,
  toJSON: () => ({}),
} as DOMRect;

describe('getRectAtOffset', () => {
  let element: HTMLDivElement;
  const originalCreateRange = document.createRange;

  beforeEach(() => {
    element = document.createElement('div');
    element.contentEditable = 'plaintext-only';
    document.body.appendChild(element);

    // JSDOM doesn't implement Range.getBoundingClientRect
    document.createRange = () => {
      const range = originalCreateRange.call(document);
      range.getBoundingClientRect = () => mockDOMRect;
      return range;
    };
  });

  afterEach(() => {
    document.body.removeChild(element);
    document.createRange = originalCreateRange;
  });

  it('returns a DOMRect for offset within a single text node', () => {
    element.textContent = 'hello world';

    const rect = getRectAtOffset(element, 5);

    expect(rect).toBe(mockDOMRect);
  });

  it('returns a DOMRect at offset 0', () => {
    element.textContent = 'hello';

    const rect = getRectAtOffset(element, 0);

    expect(rect).toBe(mockDOMRect);
  });

  it('returns a DOMRect for the last character', () => {
    element.textContent = 'hello';

    const rect = getRectAtOffset(element, 4);

    expect(rect).toBe(mockDOMRect);
  });

  it('handles multiple text nodes', () => {
    element.appendChild(document.createTextNode('hello'));
    element.appendChild(document.createTextNode(' world'));

    // Offset 7 = 'hello w' → inside second text node at local offset 2
    const rect = getRectAtOffset(element, 7);

    expect(rect).toBe(mockDOMRect);
  });

  it('returns null when element has no text nodes', () => {
    const rect = getRectAtOffset(element, 0);

    expect(rect).toBeNull();
  });

  it('returns null when offset exceeds total text length', () => {
    element.textContent = 'hi';

    const rect = getRectAtOffset(element, 10);

    expect(rect).toBeNull();
  });

  it('handles offset at text node boundary', () => {
    element.appendChild(document.createTextNode('abc'));
    element.appendChild(document.createTextNode('def'));

    // Offset 3 resolves to the start of the second node ('d')
    const rect = getRectAtOffset(element, 3);

    expect(rect).toBe(mockDOMRect);
  });

  it('returns null when offset equals text length (no character at index)', () => {
    element.textContent = 'hello';

    const rect = getRectAtOffset(element, 5);

    expect(rect).toBeNull();
  });
});
