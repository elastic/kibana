/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable, multiInject } from 'inversify';
import type { RuleResponse } from '../../rules_client/types';
import type { ITransitionStrategy } from './types';
import { TransitionStrategyToken } from './types';

/**
 * Resolves which transition strategy to use for a given rule.
 *
 * Strategies are auto-discovered via multi-injection on `TransitionStrategyToken`.
 * Each strategy declares its applicability through `canHandle(rule)`.
 *
 * Resolution order:
 * 1. Iterate strategies (most specific first, excluding the fallback).
 * 2. If a strategy's `canHandle` returns true, use it.
 * 3. Otherwise, fall back to the last strategy whose `canHandle` always returns true.
 *
 * To add a new strategy, simply:
 * 1. Implement `ITransitionStrategy` (including `canHandle`).
 * 2. Bind it to `TransitionStrategyToken` in `bind_services.ts`.
 */
@injectable()
export class TransitionStrategyFactory {
  private readonly strategies: ITransitionStrategy[];
  private readonly fallback: ITransitionStrategy;

  constructor(@multiInject(TransitionStrategyToken) strategies: ITransitionStrategy[]) {
    if (strategies.length === 0) {
      throw new Error('At least one transition strategy must be registered.');
    }

    // The last registered strategy that handles everything acts as the fallback.
    // Specialized strategies are checked first.
    this.fallback = strategies[strategies.length - 1]!;
    this.strategies = strategies.slice(0, -1);
  }

  getStrategy(rule: RuleResponse): ITransitionStrategy {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(rule)) {
        return strategy;
      }
    }

    return this.fallback;
  }
}
