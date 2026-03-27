/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicTransitionStrategy } from './basic_strategy';
import { CountTimeframeStrategy } from './count_timeframe_strategy';
import { TransitionStrategyFactory } from './strategy_resolver';

export function createTransitionStrategyFactory(): TransitionStrategyFactory {
  const countTimeframeStrategy = new CountTimeframeStrategy();
  const basicStrategy = new BasicTransitionStrategy();
  return new TransitionStrategyFactory([countTimeframeStrategy, basicStrategy]);
}
