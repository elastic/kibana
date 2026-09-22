/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMMAND_BADGE_ATTRIBUTE } from './attributes';
import { charOffsetToDomPosition } from './char_offset_to_dom_position';

describe('charOffsetToDomPosition', () => {
  it('returns position within a single text node', () => {
    const container = document.createElement('div');
    const text = document.createTextNode('hello world');
    container.appendChild(text);

    const result = charOffsetToDomPosition(container, 5);

    expect(result.node).toBe(text);
    expect(result.offset).toBe(5);
  });

  it('returns position at the start of a text node', () => {
    const container = document.createElement('div');
    const text = document.createTextNode('hello');
    container.appendChild(text);

    const result = charOffsetToDomPosition(container, 0);

    expect(result.node).toBe(text);
    expect(result.offset).toBe(0);
  });

  it('returns position after the last node when offset is at the end', () => {
    const container = document.createElement('div');
    container.appendChild(document.createTextNode('hello'));

    const result = charOffsetToDomPosition(container, 6);

    expect(result.node).toBe(container);
    expect(result.offset).toBe(container.childNodes.length);
  });

  it('handles mixed text and badge nodes', () => {
    const container = document.createElement('div');
    const text1 = document.createTextNode('hi ');
    container.appendChild(text1);

    const badge = document.createElement('span');
    badge.setAttribute(COMMAND_BADGE_ATTRIBUTE, 'true');
    badge.textContent = 'Summarize';
    container.appendChild(badge);

    const text2 = document.createTextNode(' there');
    container.appendChild(text2);

    // Offset 3 is at end of "hi " text node
    const result1 = charOffsetToDomPosition(container, 3);
    expect(result1.node).toBe(text1);
    expect(result1.offset).toBe(3);

    // Offset 5 is within the badge (badge text = "Summarize", 9 chars)
    // Should return position before the badge in parent
    const result2 = charOffsetToDomPosition(container, 5);
    expect(result2.node).toBe(container);
    expect(result2.offset).toBe(1); // index of badge in childNodes

    // Offset 12 (3 + 9 = 12) is at start of " there"
    const result3 = charOffsetToDomPosition(container, 12);
    expect(result3.node).toBe(text2);
    expect(result3.offset).toBe(0);
  });

  it('returns end position for empty container', () => {
    const container = document.createElement('div');

    const result = charOffsetToDomPosition(container, 0);

    expect(result.node).toBe(container);
    expect(result.offset).toBe(0);
  });
});
