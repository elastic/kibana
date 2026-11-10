/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { CoreStart } from '@kbn/core-di-server';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import {
  RuleChangesHistoryServiceToken,
  type RuleChangesHistoryServiceContract,
} from '../../rule_changes_history';
import type { RuleEvent } from '../rule_event_publisher/events';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';
import { BaseEventBusSubscriber } from '../base_event_bus_subscriber';
import { RULE_LIFECYCLE_TO_CHANGES_HISTORY_MAP } from './mappings';

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
export class RuleChangesHistorySubscriber extends BaseEventBusSubscriber {
  constructor(
    @inject(AlertingDomainEventBusToken)
    bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(RuleChangesHistoryServiceToken)
    private readonly changeHistory: RuleChangesHistoryServiceContract,
    @inject(CoreStart('userProfile'))
    private readonly userProfile: UserProfileServiceStart,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    super(bus, loggerService.forSubsystem('events'));
  }

  protected createSubscriptions(
    bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>
  ): Subscription[] {
    return (Object.keys(RULE_LIFECYCLE_TO_CHANGES_HISTORY_MAP) as Array<RuleEvent['type']>).map(
      (eventType) => bus.subscribe(eventType, (event, context) => this.#dispatch(event, context))
    );
  }

  async #dispatch(event: RuleEvent, context: AlertingPublisherContext): Promise<void> {
    const { ruleId, spaceId, rule, correlationId } = event.payload;

    // Nothing orderable to log without the domain rule and its version sequence.
    if (!rule) {
      return;
    }
    const sequence = rule.version;

    const { action, eventType } = RULE_LIFECYCLE_TO_CHANGES_HISTORY_MAP[event.type];

    try {
      const profile = await this.userProfile.getCurrent({ request: context.request });
      const author = {
        uid: profile?.uid ?? null,
        username: profile?.user.username ?? null,
      };

      await this.changeHistory.logRuleChanges({
        spaceId,
        author,
        entries: [{ id: ruleId, snapshot: rule, sequence }],
        action,
        eventType,
        correlationId,
      });
    } catch (err) {
      this.logger.error({
        error: err,
        code: ALERTING_LOG_CODES.EVENTS_RULE_CHANGES_HISTORY_SUBSCRIBER_FAILED,
        labels: {
          event_type: event.type,
          rule_id: ruleId,
          space_id: spaceId,
        },
      });
    }
  }
}
