/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { Container } from 'inversify';
import type { AlertStatusChangedTriggerPayload } from '../../../../common/workflows/triggers';
import { AlertStatusChangedOptIns } from '../../alert_status_changed';
import { RulesClient } from '../../rules_client';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createRuleResponse } from '../../test_utils';
import {
  AlertActionEventPublisher,
  type EpisodeStatusChanges,
} from '../alert_action_event_publisher/alert_action_event_publisher';
import {
  EPISODE_ACTIVATED_EVENT_TYPE,
  EPISODE_DEACTIVATED_EVENT_TYPE,
  type AlertActionEvent,
  type EpisodeActivatedEvent,
  type EpisodeDeactivatedEvent,
  type EpisodeStatusChange,
} from '../alert_action_event_publisher/events';
import {
  AlertStatusChangedEventPublisher,
  type AlertStatusChangedEventPublisherContract,
} from '../alert_status_changed_event_publisher/alert_status_changed_event_publisher';
import { ALERT_STATUS_CHANGED_EVENT_TYPE } from '../alert_status_changed_event_publisher/events';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { AsyncDomainEventBus } from '../event_bus/event_bus';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import { handlerFor } from '../test_utils';
import { AlertStatusChangedUserActionSubscriber } from './alert_status_changed_user_action_subscriber';

const PUBLISH_FAILED = 'EVENTS_ALERT_STATUS_CHANGED_PUBLISH_FAILED';

const rule = createRuleResponse({
  id: 'rule-1',
  metadata: { name: 'CPU above 90%', tags: ['k8s'] },
});

const envelope = {
  occurredAt: '2026-01-01T00:00:00.000Z',
  groupHash: 'group-1',
  episodeId: 'episode-1',
  ruleId: 'rule-1',
  spaceId: 'default',
  actorUid: 'user-1',
} as const;

const statusChange: EpisodeStatusChange = {
  previousStatus: 'active',
  severity: 'high',
  source: 'internal',
};

const deactivated = (
  overrides: Partial<EpisodeDeactivatedEvent> = {}
): EpisodeDeactivatedEvent => ({
  type: EPISODE_DEACTIVATED_EVENT_TYPE,
  ...envelope,
  payload: { reason: 'resolved', statusChange },
  ...overrides,
});

const activated = (overrides: Partial<EpisodeActivatedEvent> = {}): EpisodeActivatedEvent => ({
  type: EPISODE_ACTIVATED_EVENT_TYPE,
  ...envelope,
  payload: {
    reason: 'reopen',
    statusChange: { previousStatus: 'inactive', severity: 'high', source: 'internal' },
  },
  ...overrides,
});

/** The trigger payload of a deactivate of the default `episode-1` alert of `rule-1`. */
const deactivatedPayload = (
  overrides: Partial<AlertStatusChangedTriggerPayload> = {}
): AlertStatusChangedTriggerPayload => ({
  spaceId: 'default',
  source: 'internal',
  alert: {
    id: 'episode-1',
    groupHash: 'group-1',
    status: 'inactive',
    previousStatus: 'active',
    severity: null,
  },
  rule: { id: 'rule-1', name: 'CPU above 90%', tags: ['k8s'] },
  execution: null,
  ...overrides,
});

const contextFor = (request: KibanaRequest): AlertingPublisherContext => ({
  request,
  origin: { actor: 'user', channel: 'api' },
});

describe('AlertStatusChangedUserActionSubscriber', () => {
  let bus: jest.Mocked<
    ReturnType<typeof createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>>
  >;
  let rulesClient: jest.Mocked<Pick<RulesClient, 'getRules'>>;
  let optIns: AlertStatusChangedOptIns;
  let isEnabled: jest.Mock;
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let fork: jest.Mock;
  let subscriber: AlertStatusChangedUserActionSubscriber;
  let request: KibanaRequest;

  /** A fork like core DI's: a container with the request bound, the clients of that request resolvable. */
  const createFork = (publisherBus: typeof bus): Container => {
    const scope = new Container();
    scope.bind(RulesClient).toConstantValue(rulesClient as unknown as RulesClient);
    scope
      .bind<AlertStatusChangedEventPublisherContract>(AlertStatusChangedEventPublisher)
      .toDynamicValue(
        ({ get }) =>
          new AlertStatusChangedEventPublisher(publisherBus, get(Request), 'user', optIns)
      );
    return scope;
  };

  const published = (): AlertStatusChangedTriggerPayload[] =>
    bus.publish.mock.calls.flatMap(([event]) =>
      event.type === ALERT_STATUS_CHANGED_EVENT_TYPE ? [event.payload] : []
    );

  const dispatch = (
    event: AlertActionEvent,
    forRequest: KibanaRequest = request
  ): void | Promise<void> => handlerFor(bus, event.type)(event, contextFor(forRequest));

  beforeEach(() => {
    bus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
    rulesClient = { getRules: jest.fn().mockResolvedValue({ items: [rule], errors: [] }) };
    ({ loggerService, mockLogger } = createLoggerService());
    optIns = new AlertStatusChangedOptIns(loggerService);
    isEnabled = jest.fn().mockResolvedValue(true);
    optIns.register({ isEnabled });
    fork = jest.fn(() => createFork(bus));
    request = httpServerMock.createKibanaRequest();
    subscriber = new AlertStatusChangedUserActionSubscriber(
      bus,
      { fork } as unknown as CoreDiServiceStart,
      loggerService
    );
    subscriber.start();
  });

  const expectPublishFailedWarning = (labels: Record<string, unknown> = {}) =>
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        labels: expect.objectContaining({ code: PUBLISH_FAILED, ...labels }),
      })
    );

  describe('publishing', () => {
    it('subscribes to episode.activated and episode.deactivated only', () => {
      expect(bus.subscribe.mock.calls.map(([type]) => type).sort()).toEqual([
        EPISODE_ACTIVATED_EVENT_TYPE,
        EPISODE_DEACTIVATED_EVENT_TYPE,
      ]);
    });

    it('publishes the status change of a deactivate with no severity and the rule', async () => {
      await dispatch(deactivated());

      expect(published()).toEqual([deactivatedPayload()]);
      expect(bus.publish).toHaveBeenCalledWith(expect.anything(), {
        request,
        origin: { actor: 'user', channel: 'api' },
      });
      expect(rulesClient.getRules).toHaveBeenCalledWith(['rule-1']);
    });

    it('publishes an activate as active with the stored severity', async () => {
      await dispatch(activated());

      expect(published()).toEqual([
        deactivatedPayload({
          alert: {
            id: 'episode-1',
            groupHash: 'group-1',
            status: 'active',
            previousStatus: 'inactive',
            severity: 'high',
          },
        }),
      ]);
    });

    it('publishes a null previous status and severity as stored', async () => {
      await dispatch(
        activated({
          payload: {
            reason: 'reopen',
            statusChange: { previousStatus: null, severity: null, source: 'internal' },
          },
        })
      );

      expect(published()).toEqual([
        expect.objectContaining({
          alert: expect.objectContaining({ previousStatus: null, severity: null }),
        }),
      ]);
    });

    it('publishes rule: null with the stored source for an alert without a rule, reading no rule', async () => {
      const source = 'elastic.significant_events';

      await dispatch(
        deactivated({
          ruleId: null,
          payload: { reason: 'resolved', statusChange: { ...statusChange, source } },
        })
      );

      expect(published()).toEqual([deactivatedPayload({ source, rule: null })]);
      expect(rulesClient.getRules).not.toHaveBeenCalled();
    });

    it('ignores an event without a status change, reading no rule and asking no opt-in', async () => {
      await dispatch(deactivated({ payload: { reason: 'resolved' } }));
      await dispatch(activated({ payload: { reason: 'reopen' } }));

      expect(bus.publish).not.toHaveBeenCalled();
      expect(rulesClient.getRules).not.toHaveBeenCalled();
      expect(isEnabled).not.toHaveBeenCalled();
      expect(fork).not.toHaveBeenCalled();
    });

    it('reads no rule and publishes nothing when no opt-in is enabled', async () => {
      isEnabled.mockResolvedValue(false);

      await dispatch(deactivated());

      expect(rulesClient.getRules).not.toHaveBeenCalled();
      expect(bus.publish).not.toHaveBeenCalled();
      // Only the publisher is resolved; the rules client is built on first rule read.
      expect(fork).toHaveBeenCalledTimes(1);
    });

    it('stops handling events after stop()', () => {
      subscriber.stop();

      // The mocked bus hands the same subscription to both handlers.
      expect(bus.subscribe.mock.results[0].value.unsubscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('per-request scope', () => {
    it('reads a rule once and asks the opt-ins once for several events of one request', async () => {
      await dispatch(deactivated());
      await dispatch(activated({ episodeId: 'episode-2', groupHash: 'group-2' }));
      await dispatch(deactivated({ episodeId: 'episode-3', groupHash: 'group-3' }));

      expect(published().map(({ alert }) => alert.id)).toEqual([
        'episode-1',
        'episode-2',
        'episode-3',
      ]);
      expect(rulesClient.getRules).toHaveBeenCalledTimes(1);
      expect(isEnabled).toHaveBeenCalledTimes(1);
      // One fork per request-scoped client (rules client, publisher), not per event.
      expect(fork).toHaveBeenCalledTimes(2);
    });

    it('reads uncached rules in one batch for events of one request', async () => {
      rulesClient.getRules.mockImplementation(async ([id]) => ({
        items: [createRuleResponse({ id, metadata: { name: id, tags: [] } })],
        errors: [],
      }));

      await Promise.all([
        dispatch(deactivated()),
        dispatch(deactivated({ ruleId: 'rule-2', episodeId: 'episode-2' })),
        dispatch(deactivated({ episodeId: 'episode-3' })),
      ]);

      expect(rulesClient.getRules.mock.calls).toEqual([[['rule-1', 'rule-2']]]);
    });

    it('does not share rules or opt-in answers across requests', async () => {
      const otherRequest = httpServerMock.createKibanaRequest();

      await dispatch(deactivated(), request);
      await dispatch(deactivated(), otherRequest);

      expect(rulesClient.getRules).toHaveBeenCalledTimes(2);
      expect(isEnabled).toHaveBeenCalledTimes(2);
      expect(bus.publish).toHaveBeenLastCalledWith(expect.anything(), {
        request: otherRequest,
        origin: { actor: 'user', channel: 'api' },
      });
    });
  });

  describe('failure handling', () => {
    it.each([
      [
        'an error item',
        () =>
          rulesClient.getRules.mockResolvedValue({
            items: [],
            errors: [{ id: 'rule-1', error: { code: 'RULE_NOT_FOUND', message: 'not found' } }],
          }),
      ],
      ['a deleted rule', () => rulesClient.getRules.mockResolvedValue({ items: [], errors: [] })],
      [
        'a throwing lookup',
        () => rulesClient.getRules.mockRejectedValue(new Error('rules index unavailable')),
      ],
    ])('publishes nothing and warns once per rule and request for %s', async (_, arrange) => {
      arrange();

      await expect(dispatch(deactivated())).resolves.toBeUndefined();
      await expect(dispatch(deactivated({ episodeId: 'episode-2' }))).resolves.toBeUndefined();

      expect(bus.publish).not.toHaveBeenCalled();
      expect(rulesClient.getRules).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expectPublishFailedWarning({ rule_id: 'rule-1', space_id: 'default' });
    });

    it('skips only the events of the unreadable rule', async () => {
      rulesClient.getRules.mockImplementation(async ([id]) =>
        id === 'rule-1'
          ? { items: [rule], errors: [] }
          : { items: [], errors: [{ id, error: { code: 'RULE_NOT_FOUND', message: 'gone' } }] }
      );

      await dispatch(deactivated({ ruleId: 'deleted-rule', episodeId: 'episode-2' }));
      await dispatch(deactivated());

      expect(published()).toEqual([deactivatedPayload()]);
      expectPublishFailedWarning({ rule_id: 'deleted-rule' });
    });

    it('warns again for the same rule on another request', async () => {
      rulesClient.getRules.mockResolvedValue({ items: [], errors: [] });

      await dispatch(deactivated(), request);
      await dispatch(deactivated(), httpServerMock.createKibanaRequest());

      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });

    it('logs and does not rethrow when resolving the request-scoped clients throws', async () => {
      fork.mockImplementation(() => {
        throw new Error('space lookup failed');
      });

      await expect(dispatch(deactivated())).resolves.toBeUndefined();
      await expect(dispatch(deactivated({ episodeId: 'episode-2' }))).resolves.toBeUndefined();

      expect(bus.publish).not.toHaveBeenCalled();
      expect(fork).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expectPublishFailedWarning({ space_id: 'default' });
    });

    it('logs and does not rethrow when the opt-in check throws', async () => {
      const failingPublisher: AlertStatusChangedEventPublisherContract = {
        publishAlertStatusChanges: jest.fn().mockRejectedValue(new Error('bus down')),
      };
      fork.mockImplementation(() => {
        const scope = createFork(bus);
        scope.rebind(AlertStatusChangedEventPublisher).toConstantValue(failingPublisher as never);
        return scope;
      });

      await expect(dispatch(deactivated())).resolves.toBeUndefined();

      expectPublishFailedWarning();
    });
  });

  describe('with the real bus', () => {
    it('publishes alert.status.changed for an episode.deactivated emitted by the action publisher', async () => {
      const realBus = new AsyncDomainEventBus<AlertingDomainEvent, AlertingPublisherContext>(
        loggerService
      );
      const actionPublisher = new AlertActionEventPublisher(realBus, loggerService);
      const realFork = jest.fn(() => {
        const scope = createFork(realBus as unknown as typeof bus);
        return scope;
      });
      const realSubscriber = new AlertStatusChangedUserActionSubscriber(
        realBus,
        { fork: realFork } as unknown as CoreDiServiceStart,
        loggerService
      );
      realSubscriber.start();
      const onStatusChanged = new Promise<{
        payload: AlertStatusChangedTriggerPayload;
        context: AlertingPublisherContext;
      }>((resolve) => {
        realBus.subscribe(ALERT_STATUS_CHANGED_EVENT_TYPE, (event, context) =>
          resolve({ payload: event.payload, context })
        );
      });
      const action = {
        '@timestamp': envelope.occurredAt,
        group_hash: envelope.groupHash,
        alert_id: envelope.episodeId,
        rule_id: envelope.ruleId,
        space_id: envelope.spaceId,
        actor: { type: 'user', profile_uid: envelope.actorUid },
        action_type: 'deactivate',
        reason: 'resolved',
        source: 'internal',
      } as Parameters<AlertActionEventPublisher['emitEpisodeActions']>[1][number];
      const statusChanges: EpisodeStatusChanges = new Map([[action, statusChange]]);

      actionPublisher.emitEpisodeActions(request, [action], statusChanges);

      const { payload, context } = await onStatusChanged;
      expect(payload).toEqual(deactivatedPayload());
      expect(context.request).toBe(request);
      realSubscriber.stop();
    });
  });
});
