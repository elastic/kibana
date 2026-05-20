/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { EventBus } from '../event_bus';
import { AlertingDomainEventBusToken, type AlertingDomainEvent } from '../domain_events';
import {
  EPISODE_ASSIGNED_EVENT_TYPE,
  type AlertActionEventEnvelope,
  type EpisodeAssignedEvent,
} from './events';

/**
 * Caller-friendly inputs shared by every `emit*` method on the publisher.
 *
 * Each method extends this with its event-specific payload fields, kept
 * flat so callers construct a single object rather than a nested
 * `{ envelope, payload }` shape. The publisher does the lift.
 */
export interface BaseEmitAlertActionParams {
  readonly groupHash: string;
  readonly episodeId: string;
  readonly ruleId: string;
  readonly spaceId: string;
  /** Actor user-profile uid, or `null` for internal/system actors. */
  readonly actorUid: string | null;
  /**
   * ISO timestamp of when the action occurred. Defaults to
   * `new Date().toISOString()` when omitted.
   */
  readonly occurredAt?: string;
}

/** Caller-friendly parameters for {@link AlertActionEventPublisherContract.emitEpisodeAssigned}. */
export interface EmitEpisodeAssignedParams extends BaseEmitAlertActionParams {
  /** New assignee user-profile uid, or `null` when unassigning. */
  readonly assigneeUid: string | null;
}

/**
 * Public contract for the alert-action event publisher.
 *
 * One method per concrete event. Additional `emit*` methods will be added
 * as the other alert-action types (ack, snooze, tag, …) start publishing.
 */
export interface AlertActionEventPublisherContract {
  emitEpisodeAssigned(params: EmitEpisodeAssignedParams): void;
}

/**
 * Singleton publisher of alert-action domain events onto the in-process
 * {@link EventBus}.
 *
 * Owns the construction of the canonical event shape (envelope + payload).
 * Each `emit*` method:
 *
 *  1. Lifts the common envelope from the caller's flat params via
 *     {@link AlertActionEventPublisher#buildEnvelope}, including the
 *     `occurredAt` timestamp default.
 *  2. Builds the event-specific `payload`.
 *  3. Tags the result with the event's `type` discriminator and publishes.
 *
 * Publishing is fire-and-forget — `publish` returns synchronously and
 * subscriber work runs on the next event-loop iteration. See
 * {@link EventBus} for the dispatch contract.
 */
@injectable()
export class AlertActionEventPublisher implements AlertActionEventPublisherContract {
  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly eventBus: EventBus<AlertingDomainEvent>
  ) {}

  public emitEpisodeAssigned(params: EmitEpisodeAssignedParams): void {
    const event: EpisodeAssignedEvent = {
      type: EPISODE_ASSIGNED_EVENT_TYPE,
      ...this.buildEnvelope(params),
      payload: {
        assigneeUid: params.assigneeUid,
      },
    };

    this.eventBus.publish(event);
  }

  private buildEnvelope(common: BaseEmitAlertActionParams): AlertActionEventEnvelope {
    return {
      occurredAt: common.occurredAt ?? new Date().toISOString(),
      groupHash: common.groupHash,
      episodeId: common.episodeId,
      ruleId: common.ruleId,
      spaceId: common.spaceId,
      actorUid: common.actorUid,
    };
  }
}
