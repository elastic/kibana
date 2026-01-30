/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { ITransitionStrategy } from './types';
import { BasicTransitionStrategy } from './basic_strategy';

@injectable()
export class TransitionStrategyResolver {
  private strategies = new Map<string, ITransitionStrategy>();
  private defaultStrategy: ITransitionStrategy;

  constructor(@inject(BasicTransitionStrategy) basic: BasicTransitionStrategy) {
    this.register(basic);
    this.defaultStrategy = basic;
  }

  register(strategy: ITransitionStrategy) {
    this.strategies.set(strategy.name, strategy);
  }

  resolve(): ITransitionStrategy {
    return this.defaultStrategy;
  }
}
