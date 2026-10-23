/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { EbtServiceContract } from '../../services/ebt_service/ebt_service';
import { EbtServiceToken } from '../../services/ebt_service/tokens';
import { buildWorkflowDispatchedEventData } from '../../telemetry/workflow_dispatched_ebt_event';
import { WORKFLOW_DISPATCHED_EBT_EVENT_TYPE } from '../../telemetry/workflow_ebt_schema';
import {
  AlertingDomainEventBusToken,
  DISPATCHER_EXECUTION_COMPLETED_EVENT_TYPE,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
  type DispatcherExecutionCompletedEvent,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';

/**
 * Singleton bus subscriber that reports one `alerting_v2_workflow_dispatched`
 * EBT event per delivery of a completed dispatcher tick, through the
 * {@link EbtServiceContract}.
 */
@injectable()
export class DispatcherTelemetrySubscriber {
  #subscription?: Subscription;

  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(EbtServiceToken) private readonly ebtService: EbtServiceContract,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('events');
  }

  public start(): void {
    if (this.#subscription) {
      this.logger.debug({
        message: () => 'Subscriber start called more than once; ignoring',
      });

      return;
    }

    this.#subscription = this.bus.subscribe<DispatcherExecutionCompletedEvent>(
      DISPATCHER_EXECUTION_COMPLETED_EVENT_TYPE,
      (event) => this.#reportDispatchedWorkflows(event)
    );
  }

  public stop(): void {
    this.#subscription?.unsubscribe();
    this.#subscription = undefined;
  }

  #reportDispatchedWorkflows({ payload }: DispatcherExecutionCompletedEvent): void {
    for (const delivery of payload.deliveries) {
      this.ebtService.reportEvent(
        WORKFLOW_DISPATCHED_EBT_EVENT_TYPE,
        buildWorkflowDispatchedEventData(delivery)
      );
    }
  }
}
