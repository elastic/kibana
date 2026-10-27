/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AlertAction } from '../../../resources/datastreams/alert_actions';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { EbtServiceContract } from '../../services/ebt_service/ebt_service';
import { ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE } from '../../telemetry/alert_action_ebt_event';
import type { EventBus } from '../event_bus';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { createAlertActionEventPublisher } from './alert_action_event_publisher.mock';
import type { AlertActionEventPublisher } from './alert_action_event_publisher';
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
} from './events';

const createAction = (overrides: Partial<AlertAction> = {}): AlertAction => ({
  '@timestamp': '2025-02-02T12:34:56.000Z',
  group_hash: 'group-hash-1',
  alert_id: 'episode-1',
  rule_id: 'rule-1',
  space_id: 'default',
  actor: { type: 'user', profile_uid: 'actor-uid-1' },
  action_type: 'assign',
  assignee_uid: 'user-uid-1',
  last_series_event_timestamp: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const UI_HEADERS = {
  'kbn-version': '9.0.0',
  referer: 'http://localhost:5601/app/observability',
  'x-elastic-internal-origin': 'kibana',
};

const executionContextHeader = (context: object) => encodeURIComponent(JSON.stringify(context));

const createRequest = (
  headers: Record<string, string> = {},
  { isFakeRequest = false }: { isFakeRequest?: boolean } = {}
): KibanaRequest =>
  Object.assign(httpServerMock.createKibanaRequest({ headers }), { isFakeRequest });

const baseEnvelope = {
  occurredAt: '2025-02-02T12:34:56.000Z',
  groupHash: 'group-hash-1',
  episodeId: 'episode-1',
  ruleId: 'rule-1',
  spaceId: 'default',
  actorUid: 'actor-uid-1',
};

describe('AlertActionEventPublisher', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

  let publisher: AlertActionEventPublisher;
  let eventBus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let ebtService: jest.Mocked<EbtServiceContract>;
  let mockLogger: jest.Mocked<Logger>;
  let request: KibanaRequest;

  beforeEach(() => {
    ({ publisher, eventBus, ebtService, mockLogger } = createAlertActionEventPublisher());
    request = httpServerMock.createKibanaRequest();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('emitEpisodeActions per action type', () => {
    it('publishes `episode.assigned` for an assign action with a non-null assignee', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'assign' })]);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        {
          type: EPISODE_ASSIGNED_EVENT_TYPE,
          ...baseEnvelope,
          payload: { assigneeUid: 'user-uid-1' },
        },
        { request, origin: { actor: 'user', channel: 'api' } }
      );
    });

    it('publishes `episode.unassigned` for an assign action with a null assignee', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'assign', assignee_uid: null }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: EPISODE_UNASSIGNED_EVENT_TYPE, ...baseEnvelope, payload: {} },
        { request, origin: { actor: 'user', channel: 'api' } }
      );
    });

    it('publishes `episode.acked` for an ack action', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'ack' })]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: EPISODE_ACKED_EVENT_TYPE, ...baseEnvelope, payload: {} },
        { request, origin: { actor: 'user', channel: 'api' } }
      );
    });

    it('publishes `episode.unacked` for an unack action', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'unack' })]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: EPISODE_UNACKED_EVENT_TYPE, ...baseEnvelope, payload: {} },
        { request, origin: { actor: 'user', channel: 'api' } }
      );
    });

    it('publishes `episode.tagged` with the tags payload for a tag action', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'tag', tags: ['a', 'b'] }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: EPISODE_TAGGED_EVENT_TYPE, ...baseEnvelope, payload: { tags: ['a', 'b'] } },
        { request, origin: { actor: 'user', channel: 'api' } }
      );
    });

    it('defaults tags to an empty array when missing on a tag action', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'tag' })]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: EPISODE_TAGGED_EVENT_TYPE, payload: { tags: [] } }),
        { request, origin: { actor: 'user', channel: 'api' } }
      );
    });

    it('publishes `episode.snoozed` with the expiry payload for a snooze action', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'snooze', expiry: '2025-03-03T00:00:00.000Z' }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        {
          type: EPISODE_SNOOZED_EVENT_TYPE,
          ...baseEnvelope,
          payload: { expiry: '2025-03-03T00:00:00.000Z' },
        },
        { request, origin: { actor: 'user', channel: 'api' } }
      );
    });

    it('defaults expiry to null when missing on a snooze action', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'snooze' })]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: EPISODE_SNOOZED_EVENT_TYPE, payload: { expiry: null } }),
        { request, origin: { actor: 'user', channel: 'api' } }
      );
    });

    it('publishes `episode.unsnoozed` for an unsnooze action', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'unsnooze' })]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: EPISODE_UNSNOOZED_EVENT_TYPE, ...baseEnvelope, payload: {} },
        { request, origin: { actor: 'user', channel: 'api' } }
      );
    });

    it('publishes `episode.activated` with the reason payload for an activate action', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'activate', reason: 'flapping' }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: EPISODE_ACTIVATED_EVENT_TYPE, ...baseEnvelope, payload: { reason: 'flapping' } },
        { request, origin: { actor: 'user', channel: 'api' } }
      );
    });

    it('publishes `episode.deactivated` with the reason payload for a deactivate action', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'deactivate', reason: 'maintenance' }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        {
          type: EPISODE_DEACTIVATED_EVENT_TYPE,
          ...baseEnvelope,
          payload: { reason: 'maintenance' },
        },
        { request, origin: { actor: 'user', channel: 'api' } }
      );
    });

    it('does not publish for an unknown action type', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'unknown' })]);

      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('emitEpisodeActions batch behaviour', () => {
    it('processes every action in the batch (does not stop after the first)', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'ack', alert_id: 'episode-1' }),
        createAction({
          action_type: 'assign',
          alert_id: 'episode-2',
          assignee_uid: 'user-uid-2',
        }),
        createAction({ action_type: 'unsnooze', alert_id: 'episode-3' }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledTimes(3);
      expect(eventBus.publish.mock.calls[0][0]).toEqual(
        expect.objectContaining({ type: EPISODE_ACKED_EVENT_TYPE, episodeId: 'episode-1' })
      );
      expect(eventBus.publish.mock.calls[1][0]).toEqual(
        expect.objectContaining({ type: EPISODE_ASSIGNED_EVENT_TYPE, episodeId: 'episode-2' })
      );
      expect(eventBus.publish.mock.calls[2][0]).toEqual(
        expect.objectContaining({ type: EPISODE_UNSNOOZED_EVENT_TYPE, episodeId: 'episode-3' })
      );
    });

    it('skips actions that do not publish a domain event while still emitting the rest', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'unknown' }),
        createAction({ action_type: 'ack', alert_id: 'episode-2' }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish.mock.calls[0][0]).toEqual(
        expect.objectContaining({ type: EPISODE_ACKED_EVENT_TYPE, episodeId: 'episode-2' })
      );
    });
  });

  describe('envelope construction', () => {
    it('defaults `occurredAt` to the current ISO timestamp when omitted on the action', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'ack', '@timestamp': undefined as unknown as string }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ occurredAt: '2026-01-01T00:00:00.000Z' }),
        { request, origin: { actor: 'user', channel: 'api' } }
      );
    });

    it('sets a null actorUid on the envelope for an internal actor', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'ack', actor: { type: 'internal' } }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ actorUid: null }), {
        request,
        origin: { actor: 'user', channel: 'api' },
      });
    });

    it('sets a null actorUid on the envelope for a user actor without a profile uid', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'ack', actor: { type: 'user' } }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ actorUid: null }), {
        request,
        origin: { actor: 'user', channel: 'api' },
      });
    });

    it('maps a null alert_id to a null episodeId on the envelope (series-level action case)', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'snooze', alert_id: null }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ episodeId: null }), {
        request,
        origin: { actor: 'user', channel: 'api' },
      });
    });

    it('uses the request supplied per emit call (publisher is request-agnostic across invocations)', () => {
      const otherRequest = httpServerMock.createKibanaRequest();

      publisher.emitEpisodeActions(request, [createAction({ action_type: 'ack' })]);
      publisher.emitEpisodeActions(otherRequest, [createAction({ action_type: 'unack' })]);

      expect(eventBus.publish).toHaveBeenCalledTimes(2);
      expect(eventBus.publish.mock.calls[0][1]?.request).toBe(request);
      expect(eventBus.publish.mock.calls[1][1]?.request).toBe(otherRequest);
    });
  });

  describe('telemetry', () => {
    const apiOrigin = { actor: 'user', channel: 'api' } as const;

    it('reports one event with alert_count 1 for a single action', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'ack' })]);

      expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        {
          space_id: 'default',
          rule_id: 'rule-1',
          origin: apiOrigin,
          alert_count: 1,
        }
      );
    });

    it('reports one event whose alert_count is the number of actions for one rule', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'ack', alert_id: 'episode-1' }),
        createAction({ action_type: 'ack', alert_id: 'episode-2' }),
        createAction({ action_type: 'ack', alert_id: 'episode-3' }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledTimes(3);
      expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        expect.objectContaining({ rule_id: 'rule-1', alert_count: 3 })
      );
    });

    // Documented contract: alert_count is the successful items for that rule,
    // not the size of the whole API call.
    it('reports one event per rule in a batch', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'ack', rule_id: 'rule-a', alert_id: 'episode-1' }),
        createAction({ action_type: 'ack', rule_id: 'rule-a', alert_id: 'episode-2' }),
        createAction({ action_type: 'ack', rule_id: 'rule-b', alert_id: 'episode-3' }),
      ]);

      expect(ebtService.reportEvent.mock.calls.map((call) => call[1])).toEqual([
        {
          space_id: 'default',
          rule_id: 'rule-a',
          origin: apiOrigin,
          alert_count: 2,
        },
        {
          space_id: 'default',
          rule_id: 'rule-b',
          origin: apiOrigin,
          alert_count: 1,
        },
      ]);
    });

    it('reports assign and clear-assignee as one assign event', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'assign', assignee_uid: 'user-uid-1' }),
        createAction({ action_type: 'assign', assignee_uid: null, alert_id: 'episode-2' }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledTimes(2);
      expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.assign,
        {
          space_id: 'default',
          rule_id: 'rule-1',
          origin: apiOrigin,
          alert_count: 2,
        }
      );
    });

    it('omits rule_id when the alert has no rule id', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'ack', rule_id: null })]);

      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        {
          space_id: 'default',
          origin: apiOrigin,
          alert_count: 1,
        }
      );
    });

    it('does not report an unknown action type', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'unknown' })]);

      expect(ebtService.reportEvent).not.toHaveBeenCalled();
    });

    it('does not count an unknown action toward alert_count', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'unknown' }),
        createAction({ action_type: 'ack', alert_id: 'episode-2' }),
      ]);

      expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        expect.objectContaining({ alert_count: 1 })
      );
    });

    it('reports channel api when the request has no UI headers', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'ack' })]);

      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        expect.objectContaining({ origin: { actor: 'user', channel: 'api' } })
      );
    });

    it('reports channel ui and the execution-context app for a browser request', () => {
      const uiRequest = createRequest({
        ...UI_HEADERS,
        'x-kbn-context': executionContextHeader({ name: 'observability' }),
      });

      publisher.emitEpisodeActions(uiRequest, [createAction({ action_type: 'ack' })]);

      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        expect.objectContaining({
          origin: { actor: 'user', channel: 'ui', app: 'observability' },
        })
      );
    });

    it('omits origin.app when a UI request has no execution context', () => {
      publisher.emitEpisodeActions(createRequest(UI_HEADERS), [
        createAction({ action_type: 'ack' }),
      ]);

      const payload = ebtService.reportEvent.mock.calls[0]?.[1] as { origin: { app?: string } };
      expect(payload.origin).toEqual({ actor: 'user', channel: 'ui' });
      expect(payload.origin).not.toHaveProperty('app');
    });

    it('omits origin.app when the execution-context app fails validation', () => {
      const uiRequest = createRequest({
        ...UI_HEADERS,
        'x-kbn-context': executionContextHeader({ name: 'not a valid app' }),
      });

      publisher.emitEpisodeActions(uiRequest, [createAction({ action_type: 'ack' })]);

      const payload = ebtService.reportEvent.mock.calls[0]?.[1] as { origin: { app?: string } };
      expect(payload.origin).toEqual({ actor: 'user', channel: 'ui' });
    });

    it('reports a fake request as internal on the system channel', () => {
      publisher.emitEpisodeActions(createRequest({}, { isFakeRequest: true }), [
        createAction({ action_type: 'ack' }),
      ]);

      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE.ack,
        expect.objectContaining({ origin: { actor: 'internal', channel: 'system' } })
      );
    });

    it('still reports telemetry when publishing a domain event throws', () => {
      eventBus.publish.mockImplementation(() => {
        throw new Error('bus down');
      });

      expect(() =>
        publisher.emitEpisodeActions(request, [createAction({ action_type: 'ack' })])
      ).not.toThrow();

      expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish alert action domain event',
        expect.objectContaining({
          labels: expect.objectContaining({
            code: ALERTING_LOG_CODES.EVENTS_ALERT_ACTION_PUBLISH_FAILED,
          }),
        })
      );
    });

    it('logs a telemetry failure and still publishes the domain event', () => {
      const failure = new Error('telemetry down');
      ebtService.reportEvent.mockImplementation(() => {
        throw failure;
      });

      expect(() =>
        publisher.emitEpisodeActions(request, [createAction({ action_type: 'ack' })])
      ).not.toThrow();

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to report alert action telemetry',
        expect.objectContaining({
          labels: expect.objectContaining({
            code: ALERTING_LOG_CODES.TELEMETRY_EBT_REPORT_FAILED,
          }),
          error: expect.objectContaining({
            stack_trace: expect.stringContaining('telemetry down'),
          }),
        })
      );
    });
  });
});
