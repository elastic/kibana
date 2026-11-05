/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { Request } from '@kbn/core-di-server';
import { inject, injectable } from 'inversify';
import type { AlertStatusChangedTriggerPayload } from '../../../../common/workflows/triggers';
import { AlertStatusChangedOptIns } from '../../alert_status_changed';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventOriginActor } from '../../event_origin/origin_schemas';
import { toEventOrigin } from '../../event_origin/event_origin';
import { EventOriginActorToken } from '../../event_origin/token';
import type { EventBus } from '../event_bus';
import { ALERT_STATUS_CHANGED_EVENT_TYPE, type AlertStatusChangedEvent } from './events';

/**
 * Public contract for the alert status changed event publisher.
 *
 * Called with persisted status changes by the rule executor and by the alert
 * events client. The publisher owns the opt-in check, so callers never ask it
 * themselves.
 */
export interface AlertStatusChangedEventPublisherContract {
  publishAlertStatusChanges(payloads: readonly AlertStatusChangedTriggerPayload[]): Promise<void>;
}

/**
 * Request-scoped publisher of `alert.status.changed` domain events on the
 * alerting {@link EventBus}.
 *
 * Bound `inRequestScope` because the bus threads `KibanaRequest` on every
 * publish: the rule executor's container has Task Manager's `fakeRequest`
 * bound to `Request`, and the alert events client's scope has the request it
 * was created with.
 *
 * Nothing is published unless an integration has opted in for that request.
 * The answer is asked once per instance, so once per rule run, and only when
 * there is something to publish.
 */
@injectable()
export class AlertStatusChangedEventPublisher implements AlertStatusChangedEventPublisherContract {
  #isEnabled: Promise<boolean> | undefined;

  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly eventBus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(EventOriginActorToken) private readonly actor: EventOriginActor,
    @inject(AlertStatusChangedOptIns) private readonly optIns: AlertStatusChangedOptIns
  ) {}

  public async publishAlertStatusChanges(
    payloads: readonly AlertStatusChangedTriggerPayload[]
  ): Promise<void> {
    if (payloads.length === 0) {
      return;
    }

    this.#isEnabled ??= this.optIns.isEnabled(this.request);

    if (!(await this.#isEnabled)) {
      return;
    }

    for (const payload of payloads) {
      const event: AlertStatusChangedEvent = {
        type: ALERT_STATUS_CHANGED_EVENT_TYPE,
        payload,
      };

      this.eventBus.publish(event, {
        request: this.request,
        origin: toEventOrigin(this.actor, this.request),
      });
    }
  }
}
