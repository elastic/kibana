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
  EPISODE_ACKED_EVENT_TYPE,
  EPISODE_ACTIVATED_EVENT_TYPE,
  EPISODE_ASSIGNED_EVENT_TYPE,
  EPISODE_DEACTIVATED_EVENT_TYPE,
  EPISODE_SNOOZED_EVENT_TYPE,
  EPISODE_TAGGED_EVENT_TYPE,
  EPISODE_UNACKED_EVENT_TYPE,
  EPISODE_UNASSIGNED_EVENT_TYPE,
  EPISODE_UNSNOOZED_EVENT_TYPE,
  type AlertActionEvent,
  type AlertActionEventEnvelope,
} from './events';

/**
 * Public contract for the alert-action event publisher.
 *
 * Persistence callers ({@link AlertActionsClient}) use
 * {@link AlertActionEventPublisherContract.emitEpisodeActions} as the single
 * entry point. The publisher dispatches by `action_type` to build the
 * canonical bus event shape for each action.
 *
 * The method takes the publishing call site's `KibanaRequest` as its
 * first argument. The request is propagated on the bus as
 * {@link AlertingPublisherContext} so request-scoped subscribers (e.g.
 * the workflow subscriber, which needs a user-scoped workflows client)
 * can operate under the same auth identity that produced the event,
 * even though the bus dispatches asynchronously.
 */
export interface AlertActionEventPublisherContract {
  /** Convenience batch wrapper over the possible emit methods. */
  emitEpisodeActions(request: KibanaRequest, actions: readonly AlertAction[]): void;
}

/**
 * Singleton publisher of alert-action domain events onto the in-process
 * {@link EventBus}.
 *
 * Owns the construction of the canonical event shape (envelope + payload).
 * Each action type is mapped to its event-specific shape and published
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
    const context = { request };
    for (const action of actions) {
      const event = this.buildEvent(action);
      if (event) {
        this.eventBus.publish(event, context);
      }
    }
  }

  /**
   * Maps a persisted alert action to its canonical bus event, or `undefined`
   * for action types that do not (yet) publish a domain event.
   *
   * The `assign` action fans out to two distinct events depending on whether
   * an assignee was set (`episode.assigned`) or cleared (`episode.unassigned`).
   */
  private buildEvent(action: AlertAction): AlertActionEvent | undefined {
    const envelope = this.buildEnvelopeFromAction(action);

    switch (action.action_type) {
      case ALERT_EPISODE_ACTION_TYPE.ASSIGN:
        return action.assignee_uid == null
          ? { type: EPISODE_UNASSIGNED_EVENT_TYPE, ...envelope, payload: {} }
          : {
              type: EPISODE_ASSIGNED_EVENT_TYPE,
              ...envelope,
              payload: { assigneeUid: action.assignee_uid },
            };
      case ALERT_EPISODE_ACTION_TYPE.ACK:
        return { type: EPISODE_ACKED_EVENT_TYPE, ...envelope, payload: {} };
      case ALERT_EPISODE_ACTION_TYPE.UNACK:
        return { type: EPISODE_UNACKED_EVENT_TYPE, ...envelope, payload: {} };
      case ALERT_EPISODE_ACTION_TYPE.TAG:
        return {
          type: EPISODE_TAGGED_EVENT_TYPE,
          ...envelope,
          payload: { tags: action.tags ?? [] },
        };
      case ALERT_EPISODE_ACTION_TYPE.SNOOZE:
        return {
          type: EPISODE_SNOOZED_EVENT_TYPE,
          ...envelope,
          payload: { expiry: action.expiry ?? null },
        };
      case ALERT_EPISODE_ACTION_TYPE.UNSNOOZE:
        return { type: EPISODE_UNSNOOZED_EVENT_TYPE, ...envelope, payload: {} };
      case ALERT_EPISODE_ACTION_TYPE.ACTIVATE:
        return {
          type: EPISODE_ACTIVATED_EVENT_TYPE,
          ...envelope,
          payload: { reason: action.reason },
        };
      case ALERT_EPISODE_ACTION_TYPE.DEACTIVATE:
        return {
          type: EPISODE_DEACTIVATED_EVENT_TYPE,
          ...envelope,
          payload: { reason: action.reason },
        };
      default:
        return undefined;
    }
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
