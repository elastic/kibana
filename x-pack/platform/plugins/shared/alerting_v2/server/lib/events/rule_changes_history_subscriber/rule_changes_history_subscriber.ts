/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { CoreStart } from '@kbn/core-di-server';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import {
  RuleChangesHistoryServiceToken,
  type RuleChangesHistoryServiceContract,
  type RuleChangesHistorySnapshot,
} from '../../rule_changes_history';
import type { RuleEvent } from '../rule_event_publisher/events';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';
import { RULE_CHANGES_HISTORY_MAPPINGS } from './mappings';

/** Strips the saved-object OCC token that is not meaningful for change history or restore. */
const toRuleChangesHistorySnapshot = (rule: RuleResponse): RuleChangesHistorySnapshot => {
  const { version: _version, ...snapshot } = rule;
  return snapshot;
};

/**
 * Singleton bus subscriber that logs rule-lifecycle domain events to the rule
 * changes-history data stream via {@link RuleChangesHistoryServiceContract}.
 *
 * The event carries the domain rule (`rule`) which becomes the change-history
 * snapshot; the change author is resolved here from the publishing request.
 * Events without a `rule` (e.g. the bulk-delete fallback where the pre-delete
 * state could not be read) are skipped since there is nothing orderable to
 * persist.
 */
@injectable()
export class RuleChangesHistorySubscriber {
  #subscriptions: Subscription[] = [];

  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(RuleChangesHistoryServiceToken)
    private readonly changeHistory: RuleChangesHistoryServiceContract,
    @inject(CoreStart('userProfile'))
    private readonly userProfile: UserProfileServiceStart,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public start(): void {
    if (this.#subscriptions.length > 0) {
      this.logger.debug({
        message: () =>
          '[RuleChangesHistorySubscriber] start() called more than once. Ignoring. Subscriptions already active.',
      });

      return;
    }

    for (const eventType of Object.keys(RULE_CHANGES_HISTORY_MAPPINGS) as Array<
      RuleEvent['type']
    >) {
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

    // Nothing orderable to log without the domain rule and its version sequence.
    const sequence = rule?.metadata?.version;
    if (!rule || sequence === undefined) {
      return;
    }

    const { action, eventType } = RULE_CHANGES_HISTORY_MAPPINGS[event.type];

    try {
      const profile = await this.userProfile.getCurrent({ request: context.request });
      const author = {
        uid: profile?.uid ?? null,
        username: profile?.user.username ?? null,
      };

      await this.changeHistory.logRuleChanges({
        spaceId,
        author,
        entries: [{ id: ruleId, snapshot: toRuleChangesHistorySnapshot(rule), sequence }],
        action,
        eventType,
        correlationId,
      });
    } catch (err) {
      this.logger.error({
        error: err,
        code: 'RULE_CHANGES_HISTORY_SUBSCRIBER_FAILURE',
        type: `RuleChangesHistorySubscriber:${event.type}`,
      });
    }
  }
}
