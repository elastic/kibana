/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { ITransitionStrategy } from './types';
import { BasicTransitionStrategy } from './basic_strategy';

export interface RegisterStrategyOptions {
  default?: boolean;
}

@injectable()
export class TransitionStrategyFactory {
  private strategies = new Map<string, ITransitionStrategy>();
  private defaultStrategy: ITransitionStrategy;

  constructor(@inject(BasicTransitionStrategy) basic: BasicTransitionStrategy) {
    this.register(basic);
    this.defaultStrategy = basic;
  }

  register(strategy: ITransitionStrategy, options: RegisterStrategyOptions = {}) {
    this.strategies.set(strategy.name, strategy);

    if (Boolean(options.default)) {
      this.defaultStrategy = strategy;
    }
  }

  getStrategy(): ITransitionStrategy {
    return this.defaultStrategy;
  }
}
