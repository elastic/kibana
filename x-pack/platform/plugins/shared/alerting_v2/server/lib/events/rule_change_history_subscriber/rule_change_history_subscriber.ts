/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { CoreStart } from '@kbn/core-di-server';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import {
  RuleChangeHistoryServiceToken,
  type RuleChangeHistoryServiceContract,
} from '../../rule_change_history';
import type { RuleEvent } from '../rule_event_publisher/events';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';
import { RULE_CHANGE_HISTORY_MAPPINGS } from './mappings';

/**
 * Singleton bus subscriber that logs rule-lifecycle domain events to the rule
 * change-history data stream via {@link RuleChangeHistoryServiceContract}.
 *
 * The event carries the domain rule (`rule`) which becomes the change-history
 * snapshot; the change author is resolved here from the publishing request.
 * Events without a `rule` (e.g. the bulk-delete fallback where the pre-delete
 * state could not be read) are skipped since there is nothing orderable to
 * persist.
 */
@injectable()
export class RuleChangeHistorySubscriber {
  #subscriptions: Subscription[] = [];

  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(RuleChangeHistoryServiceToken)
    private readonly changeHistory: RuleChangeHistoryServiceContract,
    @inject(CoreStart('userProfile'))
    private readonly userProfile: UserProfileServiceStart,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public start(): void {
    if (this.#subscriptions.length > 0) {
      this.logger.debug({
        message: () =>
          '[RuleChangeHistorySubscriber] start() called more than once. Ignoring. Subscriptions already active.',
      });

      return;
    }

    for (const eventType of Object.keys(RULE_CHANGE_HISTORY_MAPPINGS) as Array<RuleEvent['type']>) {
      const subscription = this.bus.subscribe(eventType, (event, context) =>
        this.#dispatch(event as RuleEvent, context)
      );

      this.#subscriptions.push(subscription);
    }
  }

  public stop(): void {
    for (const subscription of this.#subscriptions) {
      subscription.unsubscribe();
    }

    this.#subscriptions = [];
  }

  async #dispatch(event: RuleEvent, context: AlertingPublisherContext): Promise<void> {
    const { ruleId, spaceId, rule, correlationId } = event.payload;

    // Nothing orderable to log without the domain rule and its revision.
    if (!rule || rule.revision === undefined) {
      return;
    }

    const { action, eventType } = RULE_CHANGE_HISTORY_MAPPINGS[event.type];

    try {
      const profile = await this.userProfile.getCurrent({ request: context.request });
      const author = {
        uid: profile?.uid ?? null,
        username: profile?.user.username ?? null,
      };

      await this.changeHistory.logRuleChanges({
        spaceId,
        author,
        entries: [{ id: ruleId, snapshot: rule, sequence: rule.revision }],
        action,
        eventType,
        correlationId,
      });
    } catch (err) {
      this.logger.error({
        error: err,
        code: 'RULE_CHANGE_HISTORY_SUBSCRIBER_FAILURE',
        type: `RuleChangeHistorySubscriber:${event.type}`,
      });
    }
  }
}
