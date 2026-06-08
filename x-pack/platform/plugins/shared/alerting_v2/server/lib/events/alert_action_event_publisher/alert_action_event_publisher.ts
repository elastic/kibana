/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { inject, injectable } from 'inversify';
import type { AlertAction } from '../../../resources/datastreams/alert_actions';
import type { EventBus } from '../event_bus';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import {
  EPISODE_ASSIGNED_EVENT_TYPE,
  type AlertActionEventEnvelope,
  type EpisodeAssignedEvent,
} from './events';

/**
 * Public contract for the alert-action event publisher.
 *
 * Persistence callers ({@link AlertActionsClient}) use
 * {@link AlertActionEventPublisherContract.emitEpisodeAction} as the single
 * entry point. The publisher dispatches by `action_type` to typed `emit*`
 * methods that build the canonical bus event shape.
 *
 * Every method takes the publishing call site's `KibanaRequest` as its
 * first argument. The request is propagated on the bus as
 * {@link AlertingPublisherContext} so request-scoped subscribers (e.g.
 * the workflow subscriber, which needs a user-scoped workflows client)
 * can operate under the same auth identity that produced the event,
 * even though the bus dispatches asynchronously.
 */
export interface AlertActionEventPublisherContract {
  /** Convenience batch wrapper over the possible emit methods. */
  emitEpisodeActions(request: KibanaRequest, actions: readonly AlertAction[]): void;
  /**
   * Publishes an `episode.assigned` domain event for a persisted assign action.
   * No-op when `assignee_uid` is null (unassign).
   */
  emitEpisodeAssigned(request: KibanaRequest, action: AlertAction): void;
}

/**
 * Singleton publisher of alert-action domain events onto the in-process
 * {@link EventBus}.
 *
 * Owns the construction of the canonical event shape (envelope + payload).
 * Each `emit*` method builds the event-specific shape and publishes it
 * alongside the publishing `KibanaRequest` as the bus's
 * {@link AlertingPublisherContext}.
 *
 * Publishing is fire-and-forget — `publish` returns synchronously and
 * subscriber work runs on the next event-loop iteration. See
 * {@link EventBus} for the dispatch contract.
 *
 * The `request` passed here determines the auth identity under which
 * downstream subscribers (notably the workflow subscriber) operate.
 * Background-task callers that have no inbound request must synthesise
 * a system request at their call site and pass it here. Do not pass
 * `null`/`undefined` or attempt to forge headers in the publisher.
 */
@injectable()
export class AlertActionEventPublisher implements AlertActionEventPublisherContract {
  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly eventBus: EventBus<AlertingDomainEvent, AlertingPublisherContext>
  ) {}

  public emitEpisodeActions(request: KibanaRequest, actions: readonly AlertAction[]): void {
    for (const action of actions) {
      switch (action.action_type) {
        case ALERT_EPISODE_ACTION_TYPE.ASSIGN:
          this.emitEpisodeAssigned(request, action);
          return;
        default:
          return;
      }
    }
  }

  public emitEpisodeAssigned(request: KibanaRequest, action: AlertAction): void {
    if (action.assignee_uid == null) {
      return;
    }

    const event: EpisodeAssignedEvent = {
      type: EPISODE_ASSIGNED_EVENT_TYPE,
      ...this.buildEnvelopeFromAction(action),
      payload: {
        assigneeUid: action.assignee_uid,
      },
    };

    this.eventBus.publish(event, { request });
  }

  private buildEnvelopeFromAction(action: AlertAction): AlertActionEventEnvelope {
    return {
      occurredAt: action['@timestamp'] ?? new Date().toISOString(),
      groupHash: action.group_hash,
      episodeId: action.episode_id!,
      ruleId: action.rule_id,
      spaceId: action.space_id,
      actorUid: action.actor,
    };
  }
}
