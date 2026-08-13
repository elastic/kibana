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
  RULE_EXECUTION_SUCCEEDED_EVENT_TYPE,
  RULE_EXECUTION_FAILED_EVENT_TYPE,
  type RuleExecutionSucceededEvent,
  type RuleExecutionSucceededPayload,
  type RuleExecutionFailedEvent,
  type RuleExecutionFailedPayload,
} from './events';

/**
 * Public contract for the rule-executor event publisher.
 *
 * Called by {@link RuleExecutionPipeline} at the end of a run to emit a
 * `rule.execution.succeeded` event on success or a `rule.execution.failed`
 * event when the run throws.
 */
export interface RuleExecutorEventPublisherContract {
  publishExecutionSucceeded(payload: RuleExecutionSucceededPayload): void;
  publishExecutionFailed(payload: RuleExecutionFailedPayload): void;
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

  public publishExecutionSucceeded(payload: RuleExecutionSucceededPayload): void {
    const event: RuleExecutionSucceededEvent = {
      type: RULE_EXECUTION_SUCCEEDED_EVENT_TYPE,
      payload,
    };

    this.eventBus.publish(event, { request: this.request });
  }

  public publishExecutionFailed(payload: RuleExecutionFailedPayload): void {
    const event: RuleExecutionFailedEvent = {
      type: RULE_EXECUTION_FAILED_EVENT_TYPE,
      payload,
    };

    this.eventBus.publish(event, { request: this.request });
  }
}
