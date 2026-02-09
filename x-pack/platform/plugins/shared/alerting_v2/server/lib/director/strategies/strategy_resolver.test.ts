/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransitionStrategyFactory } from './strategy_resolver';
import { BasicTransitionStrategy } from './basic_strategy';
import { CountTimeframeStrategy } from './count_timeframe_strategy';
import { createRuleResponse } from '../../test_utils';

describe('TransitionStrategyFactory', () => {
  let factory: TransitionStrategyFactory;
  let basicStrategy: BasicTransitionStrategy;
  let countTimeframeStrategy: CountTimeframeStrategy;

  beforeEach(() => {
    basicStrategy = new BasicTransitionStrategy();
    countTimeframeStrategy = new CountTimeframeStrategy();
    factory = new TransitionStrategyFactory([countTimeframeStrategy, basicStrategy]);
  });

  describe('getStrategy', () => {
    it('returns the basic (fallback) strategy when rule has no stateTransition', () => {
      const rule = createRuleResponse({ stateTransition: undefined });
      const resolved = factory.getStrategy(rule);
      expect(resolved).toBe(basicStrategy);
    });

    it('returns the basic (fallback) strategy when stateTransition is null', () => {
      const rule = createRuleResponse({ stateTransition: null });
      const resolved = factory.getStrategy(rule);
      expect(resolved).toBe(basicStrategy);
    });

    it('returns the count_timeframe strategy when rule has stateTransition', () => {
      const rule = createRuleResponse({ stateTransition: { pendingCount: 3 } });
      const resolved = factory.getStrategy(rule);
      expect(resolved).toBe(countTimeframeStrategy);
    });

    it('returns the count_timeframe strategy when stateTransition is an empty object', () => {
      const rule = createRuleResponse({ stateTransition: {} });
      const resolved = factory.getStrategy(rule);
      expect(resolved).toBe(countTimeframeStrategy);
    });
  });

  describe('error handling', () => {
    it('throws when no strategies are registered', () => {
      expect(() => new TransitionStrategyFactory([])).toThrow(
        'At least one transition strategy must be registered.'
      );
    });
  });
});
