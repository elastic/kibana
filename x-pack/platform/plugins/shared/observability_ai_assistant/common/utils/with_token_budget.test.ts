/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withTokenBudget } from './with_token_budget';

describe('withTokenBudget', () => {
  describe('when applying budgets', () => {
    it('returns only the items that fit in the budget', () => {
      const items = ['Some content', 'Another piece of content', 'And still more content']; // [2, 4, 4] tokens
      expect(withTokenBudget(items, 6)).toEqual(items.slice(0, 2));
    });

    it('returns all items if they all fit in the budget', () => {
      const items = ['Some content', 'Another piece of content', 'And still more content']; // [2, 4, 4] tokens
      expect(withTokenBudget(items, 12)).toEqual(items);
    });

    it('returns no items if the first item exceeds the budget', () => {
      const items = ['Some content', 'Another piece of content', 'And still more content']; // [2, 4, 4] tokens
      expect(withTokenBudget(items, 1)).toEqual([]);
    });

    it('returns as many items as possible when asked to maximize the budget', () => {
      const items = ['Another piece of content', 'And still more content', 'Some content']; // [4, 4, 2] tokens
      expect(withTokenBudget(items, 6)).toEqual(items.slice(0, 1));
      expect(withTokenBudget(items, 6, { maximizeBudget: true })).toEqual([items[0], items[2]]);
    });
  });

  describe('when using different content types and accessors', () => {
    it('accepts plain strings and decides the cost based on that', () => {
      const items = ['Some content']; // Worth 2 tokens
      expect(withTokenBudget(items, 2)).toEqual(items);
    });

    it('accepts complex types and decides the cost based on a serialization of the whole item', () => {
      const items = [{ message: 'Some content', role: 'user' }]; // Worth 10 tokens total, message worth 2 tokens
      expect(withTokenBudget(items, 2)).toEqual([]);
      expect(withTokenBudget(items, 10)).toEqual(items);
    });

    it('accepts using a custom content accessor when using complex types', () => {
      const items = [{ message: 'Some content', role: 'user' }]; // Worth 10 tokens total, message worth 2 tokens
      expect(withTokenBudget(items, 2)).toEqual([]);
      const contentAccessor = (item: (typeof items)[0]) => item.message;
      expect(withTokenBudget(items, 2, { contentAccessor })).toEqual(items);
    });
  });
});
