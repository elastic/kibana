/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { DirectorService } from '../lib/director/director';
import { BasicTransitionStrategy } from '../lib/director/strategies/basic_strategy';
import { CountTimeframeStrategy } from '../lib/director/strategies/count_timeframe_strategy';
import { TransitionStrategyFactory } from '../lib/director/strategies/strategy_resolver';
import { TransitionStrategyToken } from '../lib/director/strategies/types';
import { DispatcherService } from '../lib/dispatcher/dispatcher';
import { DispatcherServiceInternalToken } from '../lib/dispatcher/tokens';

export function bindDispatcher({ bind }: ContainerModuleLoadOptions) {
  // core-di containers default to Singleton scope, so only non-singleton
  // (request-scoped) lifetimes are annotated below.

  bind(DispatcherService).toSelf();
  bind(DispatcherServiceInternalToken).toService(DispatcherService);

  bind(DirectorService).toSelf();
  bind(TransitionStrategyFactory).toSelf();

  // Binding order defines the multi-injection resolution order.
  bind(TransitionStrategyToken).to(CountTimeframeStrategy);
  bind(TransitionStrategyToken).to(BasicTransitionStrategy);
}
