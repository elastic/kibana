/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransitionStrategyFactory } from './strategy_resolver';
import { BasicTransitionStrategy } from './basic_strategy';

describe('TransitionStrategyFactory', () => {
  let strategyFactory: TransitionStrategyFactory;
  let basicStrategy: BasicTransitionStrategy;

  beforeEach(() => {
    basicStrategy = new BasicTransitionStrategy();
    strategyFactory = new TransitionStrategyFactory(basicStrategy);
  });

  describe('constructor', () => {
    it('registers the basic strategy by default', () => {
      const resolved = strategyFactory.getStrategy();
      expect(resolved.name).toBe('basic');
    });

    it('sets basic strategy as the default', () => {
      const resolved = strategyFactory.getStrategy();
      expect(resolved).toBe(basicStrategy);
    });
  });
});
