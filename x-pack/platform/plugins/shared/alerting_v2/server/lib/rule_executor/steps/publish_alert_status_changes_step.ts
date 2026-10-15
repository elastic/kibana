/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { AlertStatusChangedTriggerPayload } from '../../../../common/workflows/triggers';
import type { AlertStatusTransition } from '../../director/director';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import {
  AlertStatusChangedEventPublisher,
  type AlertStatusChangedEventPublisherContract,
} from '../../events/alert_status_changed_event_publisher/alert_status_changed_event_publisher';
import type { RuleResponse } from '../../rules_client';
import type { PipelineStateStream, RuleExecutionInput, RuleExecutionStep } from '../types';
import { mapStep } from '../stream_utils';

/** `source` of the alert events the rule executor writes. */
const RULE_EXECUTION_SOURCE = 'internal';

const toKey = (episodeId: string, status: string): string => `${episodeId}:${status}`;

const toPayload = (
  { groupHash, episodeId, previousStatus, status }: AlertStatusTransition,
  rule: RuleResponse,
  { spaceId, executionId, scheduledAt }: RuleExecutionInput
): AlertStatusChangedTriggerPayload => ({
  spaceId,
  source: RULE_EXECUTION_SOURCE,
  alert: { id: episodeId, groupHash, status, previousStatus },
  rule: { id: rule.id, name: rule.metadata.name, tags: [...(rule.metadata.tags ?? [])] },
  execution: { executionId, scheduledAt },
});

/**
 * Publishes the alert status changes of each batch once that batch is stored.
 *
 * Runs after `StoreAlertEventsStep`, so a transition is only published when
 * its alert event was acknowledged by Elasticsearch. Halts happen before the
 * first batch is stored, so a halted run publishes nothing. A run that fails
 * partway keeps the events of the batches already stored, since those status
 * changes did happen.
 *
 * A later batch can re-read the same pre-run state (the store does not
 * refresh), so the same change can be computed again. The step remembers
 * what it published in this run and skips repeats.
 *
 * The publisher owns the opt-in check, so with no opt-in nothing reaches the
 * event bus.
 */
@injectable()
export class PublishAlertStatusChangesStep implements RuleExecutionStep {
  public readonly name = 'publish_alert_status_changes';

  constructor(
    @inject(AlertStatusChangedEventPublisher)
    private readonly publisher: AlertStatusChangedEventPublisherContract
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const published = new Set<string>();

    return mapStep(streamState, async (state) => {
      const { input, rule, alertStatusTransitions = [], storedAlertEvents = [] } = state;

      if (!rule || alertStatusTransitions.length === 0) {
        return { type: 'continue', state };
      }

      const stored = new Set(
        storedAlertEvents.flatMap(({ alert }) => (alert ? [toKey(alert.id, alert.status)] : []))
      );

      const transitions = alertStatusTransitions.filter(({ episodeId, status }) => {
        const key = toKey(episodeId, status);
        return stored.has(key) && !published.has(key);
      });

      if (transitions.length === 0) {
        return { type: 'continue', state };
      }

      for (const { episodeId, status } of transitions) {
        published.add(toKey(episodeId, status));
      }

      try {
        await this.publisher.publishAlertStatusChanges(
          transitions.map((transition) => toPayload(transition, rule, input))
        );
      } catch (error) {
        state.logger.warn({
          message: 'Failed to publish alert status changes',
          error,
          code: ALERTING_LOG_CODES.RULE_EXECUTION_ALERT_STATUS_CHANGES_PUBLISH_FAILED,
          labels: { step: this.name },
        });
      }

      return { type: 'continue', state };
    });
  }
}
