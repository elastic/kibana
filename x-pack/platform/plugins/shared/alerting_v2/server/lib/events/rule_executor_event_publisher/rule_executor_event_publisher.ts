/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { Request } from '@kbn/core-di-server';
import { inject, injectable } from 'inversify';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus } from '../event_bus';
import {
  RULE_EXECUTION_COMPLETED_EVENT_TYPE,
  type RuleExecutionEvent,
  type RuleExecutionCompletedPayload,
} from './events';

/**
 * Public contract for the rule-executor event publisher.
 *
 * Called by {@link RuleExecutionPipeline} at the end of every run to emit a
 * `rule.execution.completed` event on the alerting bus.
 */
export interface RuleExecutorEventPublisherContract {
  publishExecutionCompleted(payload: RuleExecutionCompletedPayload): void;
}

/**
 * Request-scoped publisher of rule-executor domain events on the alerting
 * {@link EventBus}.
 *
 * The publisher is bound `inRequestScope` because the alerting bus threads
 * `KibanaRequest` on every publish; the rule executor runs inside a container
 * where Task Manager's `fakeRequest` is already bound to `Request`, so this
 * injection succeeds transparently.
 */
@injectable()
export class RuleExecutorEventPublisher implements RuleExecutorEventPublisherContract {
  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly eventBus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(Request) private readonly request: KibanaRequest
  ) {}

  public publishExecutionCompleted(payload: RuleExecutionCompletedPayload): void {
    const event: RuleExecutionEvent = {
      type: RULE_EXECUTION_COMPLETED_EVENT_TYPE,
      payload,
    };

    this.eventBus.publish(event, { request: this.request });
  }
}
