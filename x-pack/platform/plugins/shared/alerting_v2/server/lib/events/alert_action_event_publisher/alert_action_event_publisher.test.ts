/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AlertAction } from '../../../resources/datastreams/alert_actions';
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
  episode_id: 'episode-1',
  rule_id: 'rule-1',
  space_id: 'default',
  actor: 'actor-uid-1',
  action_type: 'assign',
  assignee_uid: 'user-uid-1',
  last_series_event_timestamp: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

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
  let request: KibanaRequest;

  beforeEach(() => {
    ({ publisher, eventBus } = createAlertActionEventPublisher());
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
        { request }
      );
    });

    it('publishes `episode.unassigned` for an assign action with a null assignee', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'assign', assignee_uid: null }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: EPISODE_UNASSIGNED_EVENT_TYPE, ...baseEnvelope, payload: {} },
        { request }
      );
    });

    it('publishes `episode.acked` for an ack action', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'ack' })]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: EPISODE_ACKED_EVENT_TYPE, ...baseEnvelope, payload: {} },
        { request }
      );
    });

    it('publishes `episode.unacked` for an unack action', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'unack' })]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: EPISODE_UNACKED_EVENT_TYPE, ...baseEnvelope, payload: {} },
        { request }
      );
    });

    it('publishes `episode.tagged` with the tags payload for a tag action', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'tag', tags: ['a', 'b'] }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: EPISODE_TAGGED_EVENT_TYPE, ...baseEnvelope, payload: { tags: ['a', 'b'] } },
        { request }
      );
    });

    it('defaults tags to an empty array when missing on a tag action', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'tag' })]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: EPISODE_TAGGED_EVENT_TYPE, payload: { tags: [] } }),
        { request }
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
        { request }
      );
    });

    it('defaults expiry to null when missing on a snooze action', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'snooze' })]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: EPISODE_SNOOZED_EVENT_TYPE, payload: { expiry: null } }),
        { request }
      );
    });

    it('publishes `episode.unsnoozed` for an unsnooze action', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'unsnooze' })]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: EPISODE_UNSNOOZED_EVENT_TYPE, ...baseEnvelope, payload: {} },
        { request }
      );
    });

    it('publishes `episode.activated` with the reason payload for an activate action', () => {
      publisher.emitEpisodeActions(request, [
        createAction({ action_type: 'activate', reason: 'flapping' }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: EPISODE_ACTIVATED_EVENT_TYPE, ...baseEnvelope, payload: { reason: 'flapping' } },
        { request }
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
        { request }
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
        createAction({ action_type: 'ack', episode_id: 'episode-1' }),
        createAction({
          action_type: 'assign',
          episode_id: 'episode-2',
          assignee_uid: 'user-uid-2',
        }),
        createAction({ action_type: 'unsnooze', episode_id: 'episode-3' }),
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
        createAction({ action_type: 'ack', episode_id: 'episode-2' }),
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
        { request }
      );
    });

    it('preserves a null actor on the envelope (internal / system actor case)', () => {
      publisher.emitEpisodeActions(request, [createAction({ action_type: 'ack', actor: null })]);

      expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ actorUid: null }), {
        request,
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
});
