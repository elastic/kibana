/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clampEscapedMrkdwn } from './clamp_escaped_mrkdwn';

const withoutEntities = (text: string): string => text.replace(/&(amp|lt|gt);/g, '');

describe('clampEscapedMrkdwn', () => {
  it('escapes text that fits without cutting it', () => {
    expect(clampEscapedMrkdwn('a < b & c', 20)).toBe('a &lt; b &amp; c');
  });

  it('cuts plain text to the limit with an ellipsis', () => {
    const text = clampEscapedMrkdwn('x'.repeat(50), 10);

    expect(text).toBe(`${'x'.repeat(9)}…`);
  });

  it('keeps as much text as fits when escaping inflates every character', () => {
    const text = clampEscapedMrkdwn('&'.repeat(5000), 2000);

    expect(text.length).toBeLessThanOrEqual(2000);
    expect(text.length).toBeGreaterThan(1990);
    expect(text.endsWith('…')).toBe(true);
    expect(withoutEntities(text)).toBe('…');
  });

  it('never splits an entity when inflated and plain text mix', () => {
    for (let max = 5; max <= 60; max += 1) {
      const text = clampEscapedMrkdwn('a&<'.repeat(30), max);

      expect(text.length).toBeLessThanOrEqual(max);
      expect(withoutEntities(text)).not.toMatch(/[&<>]/);
    }
  });
});
