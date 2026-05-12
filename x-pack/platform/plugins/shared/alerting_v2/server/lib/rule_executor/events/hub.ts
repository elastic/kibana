/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable, multiInject, optional } from 'inversify';
import { RuleExecutionObserverToken, type RuleExecutionObserver } from './observer';
import type { RuleExecutionEvent } from './types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';

/**
 * Singleton broadcaster that fans out a {@link RuleExecutionEvent} to every
 * registered {@link RuleExecutionObserver}.
 *
 * The hub is the only thing that knows the observer list; emitters
 * (pipeline, middlewares, steps, services) only depend on the hub or on
 * {@link ExecutionContext.emit}, which the pipeline wires to `hub.emit`.
 *
 * Errors thrown by an observer are caught and logged so a misbehaving
 * observer cannot break the rule execution. Observers run synchronously
 * and in registration order.
 */
@injectable()
export class RuleExecutionObserverHub {
  constructor(
    @multiInject(RuleExecutionObserverToken)
    @optional()
    private readonly observers: RuleExecutionObserver[] = [],
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public emit(event: RuleExecutionEvent): void {
    for (const observer of this.observers) {
      try {
        observer.onEvent(event);
      } catch (error) {
        this.logger.error({
          error: error instanceof Error ? error : new Error(String(error)),
          code: 'RULE_EXECUTION_OBSERVER_ERROR',
          type: `${observer.name}:${event.kind}`,
        });
      }
    }
  }
}
