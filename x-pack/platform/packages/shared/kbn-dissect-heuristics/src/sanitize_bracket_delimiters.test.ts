/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeBracketDelimiters } from './sanitize_bracket_delimiters';
import type { DelimiterNode } from './types';

function makeNode(literal: string, pos: number[]): DelimiterNode {
  return { literal, positions: pos, medianPosition: pos[0], variance: 0 };
}

describe('sanitizeBracketDelimiters', () => {
  it('returns tree unchanged when there are no bracket characters', () => {
    const tree = [makeNode(' - ', [1, 1]), makeNode(': ', [5, 5])];
    expect(sanitizeBracketDelimiters(tree)).toEqual(tree);
  });

  it('keeps properly matched brackets intact', () => {
    const tree = [makeNode('(', [0, 0]), makeNode(' - ', [3, 3]), makeNode(')', [10, 10])];
    const result = sanitizeBracketDelimiters(tree);
    expect(result.map((n) => n.literal)).toEqual(['(', ' - ', ')']);
  });

  it('removes mismatched closer and its opener from literals', () => {
    // '(' followed by ']' later -> both '(' and ']' flagged
    const tree = [makeNode('(', [0, 0]), makeNode('value', [2, 2]), makeNode(']', [10, 10])];
    const result = sanitizeBracketDelimiters(tree);
    // '(' and ']' removed, middle node unchanged; empty nodes dropped
    expect(result.map((n) => n.literal)).toEqual(['value']);
  });

  it('removes unmatched opening brackets at end of scan from all literals', () => {
    // '[' never closed -> '[' flagged and removed from literals containing it
    const tree = [makeNode('[', [0, 0]), makeNode('[info] ', [5, 5]), makeNode(' - ', [12, 12])];
    const result = sanitizeBracketDelimiters(tree);
    expect(result.map((n) => n.literal)).toEqual(['info] ', ' - ']);
  });

  it('drops nodes whose entire literal is removed', () => {
    const tree = [makeNode('(', [0, 0]), makeNode('content', [2, 2]), makeNode(']', [9, 9])];
    const result = sanitizeBracketDelimiters(tree);
    // '(' and ']' nodes dropped
    expect(result.map((n) => n.literal)).toEqual(['content']);
  });
});
