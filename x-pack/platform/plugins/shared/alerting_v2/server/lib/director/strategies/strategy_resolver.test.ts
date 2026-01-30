/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransitionStrategyResolver } from './strategy_resolver';
import { BasicTransitionStrategy } from './basic_strategy';

describe('TransitionStrategyResolver', () => {
  let resolver: TransitionStrategyResolver;
  let basicStrategy: BasicTransitionStrategy;

  beforeEach(() => {
    basicStrategy = new BasicTransitionStrategy();
    resolver = new TransitionStrategyResolver(basicStrategy);
  });

  describe('constructor', () => {
    it('registers the basic strategy by default', () => {
      const resolved = resolver.resolve();
      expect(resolved.name).toBe('basic');
    });

    it('sets basic strategy as the default', () => {
      const resolved = resolver.resolve();
      expect(resolved).toBe(basicStrategy);
    });
  });

  describe('resolve', () => {
    it('returns the default strategy', () => {
      const resolved = resolver.resolve();
      expect(resolved).toBe(basicStrategy);
    });
  });
});
