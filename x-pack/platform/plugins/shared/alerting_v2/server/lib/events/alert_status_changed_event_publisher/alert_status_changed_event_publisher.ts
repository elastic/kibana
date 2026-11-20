/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { Request } from '@kbn/core-di-server';
import { inject, injectable } from 'inversify';
import { isFunction } from 'lodash';
import type { AlertStatusChangedTriggerPayload } from '../../../../common/workflows/triggers';
import { AlertStatusChangedOptIns, type AlertStatusChangedOptIn } from '../../alert_status_changed';
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
 * Status changes to publish, or a builder that only runs once an opt-in is
 * enabled, like a `LogMessageSource` for a log message: callers whose payloads
 * need a lookup pass a builder so nothing is read when nobody listens.
 */
export type AlertStatusChangedPayloadsSource =
  | readonly AlertStatusChangedTriggerPayload[]
  | (() => Promise<readonly AlertStatusChangedTriggerPayload[]>);

const resolvePayloads = async (
  source: AlertStatusChangedPayloadsSource
): Promise<readonly AlertStatusChangedTriggerPayload[]> => (isFunction(source) ? source() : source);

/**
 * Public contract for the alert status changed event publisher.
 *
 * Called with persisted status changes by the rule executor, by the alert
 * events client, and by the alert actions client for user activate and
 * deactivate actions. The publisher owns the opt-in check, so callers never
 * ask it themselves.
 */
export interface AlertStatusChangedEventPublisherContract {
  publishAlertStatusChanges(source: AlertStatusChangedPayloadsSource): Promise<void>;
}

/**
 * Request-scoped publisher of `alert.status.changed` domain events on the
 * alerting {@link EventBus}.
 *
 * Bound `inRequestScope` because the bus threads `KibanaRequest` on every
 * publish: the rule executor's container has Task Manager's `fakeRequest`
 * bound to `Request`, and the alert events and alert actions clients' scope
 * has the request it was created with.
 *
 * Nothing is published unless an integration has opted in for that request.
 * The answer is asked once per instance, so once per rule run, and only when
 * there is something to publish. A payload builder runs only after that answer
 * is yes.
 */
@injectable()
export class AlertStatusChangedEventPublisher implements AlertStatusChangedEventPublisherContract {
  #enabledOptIns: Promise<AlertStatusChangedOptIn[]> | undefined;

  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly eventBus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(EventOriginActorToken) private readonly actor: EventOriginActor,
    @inject(AlertStatusChangedOptIns) private readonly optIns: AlertStatusChangedOptIns
  ) {}

  public async publishAlertStatusChanges(source: AlertStatusChangedPayloadsSource): Promise<void> {
    // An empty list has nothing to publish, so the opt-ins are not even asked.
    if (!isFunction(source) && source.length === 0) {
      return;
    }

    this.#enabledOptIns ??= this.optIns.getEnabled(this.request);
    const enabledOptIns = await this.#enabledOptIns;

    if (enabledOptIns.length === 0) {
      return;
    }

    const payloads = await resolvePayloads(source);

    if (payloads.length === 0) {
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

    await this.optIns.notify(enabledOptIns, payloads);
  }
}
