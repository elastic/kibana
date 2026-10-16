/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toBulletList, toCodeFence } from './markdown';

describe('markdown helpers', () => {
  describe('toCodeFence', () => {
    it('wraps the content in a code block with its language', () => {
      expect(toCodeFence('FROM logs', 'esql')).toBe('```esql\nFROM logs\n```');
    });

    it('uses a fence longer than any backtick run in the content', () => {
      expect(toCodeFence('a\n````\nb')).toBe('`````\na\n````\nb\n`````');
    });
  });

  describe('toBulletList', () => {
    it('lists the items that are set', () => {
      expect(toBulletList(['one', undefined, false, 'two'])).toBe('- one\n- two');
    });

    it('returns an empty string when no item is set', () => {
      expect(toBulletList([undefined, false])).toBe('');
    });
  });
});
