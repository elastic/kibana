/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { CoreStart } from '@kbn/core-di-server';
import { inject, injectable } from 'inversify';
import type { AlertStatusChangedTriggerPayload } from '../../../../common/workflows/triggers';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { resolveRequestScoped } from '../../../agent_builder/resolve_request_scoped';
import { RulesClient, type RuleResponse } from '../../rules_client';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import {
  EPISODE_ACTIVATED_EVENT_TYPE,
  EPISODE_DEACTIVATED_EVENT_TYPE,
  type EpisodeActivatedEvent,
  type EpisodeDeactivatedEvent,
} from '../alert_action_event_publisher/events';
import {
  AlertStatusChangedEventPublisher,
  type AlertStatusChangedEventPublisherContract,
} from '../alert_status_changed_event_publisher/alert_status_changed_event_publisher';
import { BaseEventBusSubscriber } from '../base_event_bus_subscriber';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';

type LifecycleEvent = EpisodeActivatedEvent | EpisodeDeactivatedEvent;

/** What a request needs to publish status changes: its clients and the rules it already read. */
interface RequestScope {
  /** Resolved on first use, so requests without an enabled opt-in never build a `RulesClient`. */
  readonly getRulesClient: () => Pick<RulesClient, 'getRules'>;
  readonly publisher: AlertStatusChangedEventPublisherContract;
  /** Rule reads by rule id; a rule that cannot be read is cached as `undefined`. */
  readonly rules: Map<string, Promise<RuleResponse | undefined>>;
  readonly pending: Array<{
    readonly event: LifecycleEvent;
    readonly resolve: () => void;
  }>;
  scheduled: boolean;
}

/**
 * Singleton bus subscriber that publishes `alert.status.changed` for user
 * activate and deactivate actions.
 *
 * `AlertActionsClient` tells it which writes Elasticsearch accepted and moved
 * the status of by attaching `payload.statusChange` to `episode.activated` and
 * `episode.deactivated`; events without it are ignored. The new status follows
 * from the event type.
 *
 * The bus runs handlers after the HTTP handler may have responded, so the
 * request-scoped `RulesClient` and `AlertStatusChangedEventPublisher` are
 * resolved from the event's request and kept per request, together with the
 * rules already read. The publisher asks the opt-ins once per request and only
 * then runs the rule lookup. A rule that cannot be read skips only its events.
 * Failures are logged and never rethrown, as the action already succeeded.
 */
@injectable()
export class AlertStatusChangedUserActionSubscriber extends BaseEventBusSubscriber {
  /** `null` marks a request whose scope could not be resolved, so it is logged once. */
  readonly #scopes = new WeakMap<KibanaRequest, RequestScope | null>();

  constructor(
    @inject(AlertingDomainEventBusToken)
    bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    @inject(CoreStart('injection')) private readonly injection: CoreDiServiceStart,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    super(bus, loggerService.forSubsystem('events'));
  }

  protected createSubscriptions(
    bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>
  ): Subscription[] {
    return [
      bus.subscribe(EPISODE_ACTIVATED_EVENT_TYPE, (event, context) => this.#handle(event, context)),
      bus.subscribe(EPISODE_DEACTIVATED_EVENT_TYPE, (event, context) =>
        this.#handle(event, context)
      ),
    ];
  }

  async #handle(event: LifecycleEvent, { request }: AlertingPublisherContext): Promise<void> {
    if (!event.payload.statusChange) {
      return;
    }

    try {
      const scope = this.#getScope(request, event);
      if (!scope) {
        return;
      }

      await new Promise<void>((resolve) => {
        scope.pending.push({ event, resolve });
        if (!scope.scheduled) {
          scope.scheduled = true;
          setImmediate(() => {
            void this.#flush(scope);
          });
        }
      });
    } catch (error) {
      this.logger.warn({
        message: 'Failed to publish alert status changes for user actions',
        error,
        code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_PUBLISH_FAILED,
        labels: {
          space_id: event.spaceId,
          ...(event.ruleId != null ? { rule_id: event.ruleId } : {}),
        },
      });
    }
  }

  #getScope(request: KibanaRequest, event: LifecycleEvent): RequestScope | undefined {
    const cached = this.#scopes.get(request);
    if (cached !== undefined) {
      return cached ?? undefined;
    }

    try {
      let rulesClient: Pick<RulesClient, 'getRules'> | undefined;
      const scope: RequestScope = {
        getRulesClient: () => {
          rulesClient ??= resolveRequestScoped(this.injection, request, RulesClient);
          return rulesClient;
        },
        publisher: resolveRequestScoped(this.injection, request, AlertStatusChangedEventPublisher),
        rules: new Map(),
        pending: [],
        scheduled: false,
      };
      this.#scopes.set(request, scope);

      return scope;
    } catch (error) {
      this.#scopes.set(request, null);
      this.logger.warn({
        message: 'Failed to publish alert status changes for user actions',
        error,
        code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_PUBLISH_FAILED,
        labels: { space_id: event.spaceId },
      });

      return undefined;
    }
  }

  async #flush(scope: RequestScope): Promise<void> {
    const pending = scope.pending.splice(0);
    scope.scheduled = false;

    try {
      await scope.publisher.publishAlertStatusChanges(async () =>
        this.#buildPayloads(
          pending.map(({ event }) => event),
          scope
        )
      );
    } catch (error) {
      this.logger.warn({
        message: 'Failed to publish alert status changes for user actions',
        error,
        code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_PUBLISH_FAILED,
      });
    } finally {
      pending.forEach(({ resolve }) => resolve());
    }
  }

  /**
   * Builds trigger payloads of user status changes. There is no rule run, so
   * `execution` is null; an inactive alert reports no severity, as for the
   * other publishers.
   */
  async #buildPayloads(
    events: readonly LifecycleEvent[],
    scope: RequestScope
  ): Promise<AlertStatusChangedTriggerPayload[]> {
    const readableRules = await this.#readRules(scope, events);

    return events.flatMap((event) => {
      const { statusChange } = event.payload;
      if (!statusChange || event.episodeId == null) {
        return [];
      }

      const rule = event.ruleId == null ? null : readableRules.get(event.ruleId);
      if (rule === undefined) {
        return [];
      }

      const status = event.type === EPISODE_ACTIVATED_EVENT_TYPE ? 'active' : 'inactive';
      return [
        {
          spaceId: event.spaceId,
          source: statusChange.source,
          alert: {
            id: event.episodeId,
            groupHash: event.groupHash,
            status,
            previousStatus: statusChange.previousStatus,
            severity: status === 'inactive' ? null : statusChange.severity,
          },
          rule: rule
            ? { id: rule.id, name: rule.metadata.name, tags: [...(rule.metadata.tags ?? [])] }
            : null,
          execution: null,
        },
      ];
    });
  }

  /** Reads uncached rules in one request-scoped batch and caches each result. */
  async #readRules(
    { getRulesClient, rules }: RequestScope,
    events: readonly LifecycleEvent[]
  ): Promise<Map<string, RuleResponse | undefined>> {
    const ruleIds = [
      ...new Set(
        events.flatMap(({ ruleId }) => (ruleId == null || rules.has(ruleId) ? [] : [ruleId]))
      ),
    ];
    if (ruleIds.length > 0) {
      const loadedRules = this.#loadRules(getRulesClient, ruleIds, events[0].spaceId);
      ruleIds.forEach((ruleId) => {
        rules.set(
          ruleId,
          loadedRules.then((loaded) => loaded.get(ruleId))
        );
      });
    }

    return new Map(
      await Promise.all(
        [...new Set(events.flatMap(({ ruleId }) => (ruleId == null ? [] : [ruleId])))].map(
          async (ruleId) => [ruleId, await rules.get(ruleId)] as const
        )
      )
    );
  }

  async #loadRules(
    getRulesClient: () => Pick<RulesClient, 'getRules'>,
    ruleIds: readonly string[],
    spaceId: string
  ): Promise<Map<string, RuleResponse>> {
    try {
      const { items, errors } = await getRulesClient().getRules([...ruleIds]);
      const rulesById = new Map(items.map((rule) => [rule.id, rule]));
      const errorsById = new Map(errors.map(({ id, error }) => [id, error]));
      ruleIds.forEach((ruleId) => {
        if (rulesById.has(ruleId)) {
          return;
        }
        const readError = errorsById.get(ruleId);
        this.logger.warn({
          message: `Did not publish alert status changes for user actions: rule could not be read${
            readError ? ` (${readError.message})` : ''
          }`,
          code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_PUBLISH_FAILED,
          labels: { space_id: spaceId, rule_id: ruleId },
        });
      });
      return rulesById;
    } catch (error) {
      ruleIds.forEach((ruleId) => {
        this.logger.warn({
          message: 'Did not publish alert status changes for user actions: rule could not be read',
          error,
          code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_PUBLISH_FAILED,
          labels: { space_id: spaceId, rule_id: ruleId },
        });
      });
    }

    return new Map();
  }
}
