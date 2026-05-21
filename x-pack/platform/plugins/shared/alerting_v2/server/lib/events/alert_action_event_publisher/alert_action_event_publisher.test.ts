/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { EventBus } from '../event_bus';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { createAlertActionEventPublisher } from './alert_action_event_publisher.mock';
import type { AlertActionEventPublisher } from './alert_action_event_publisher';
import { EPISODE_ASSIGNED_EVENT_TYPE } from './events';

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

  describe('emitEpisodeAssigned', () => {
    it('publishes an `episode.assigned` event with the canonical envelope and payload shape, alongside the publishing KibanaRequest as bus context', () => {
      publisher.emitEpisodeAssigned(request, {
        groupHash: 'group-hash-1',
        episodeId: 'episode-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        assigneeUid: 'user-uid-1',
        actorUid: 'actor-uid-1',
        occurredAt: '2025-02-02T12:34:56.000Z',
      });

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        {
          type: EPISODE_ASSIGNED_EVENT_TYPE,
          occurredAt: '2025-02-02T12:34:56.000Z',
          groupHash: 'group-hash-1',
          episodeId: 'episode-1',
          ruleId: 'rule-1',
          spaceId: 'default',
          actorUid: 'actor-uid-1',
          payload: {
            assigneeUid: 'user-uid-1',
          },
        },
        { request }
      );
      // Reference equality: the publisher must not wrap or rebuild the request.
      expect(eventBus.publish.mock.calls[0][1]).toEqual({ request });
      expect(eventBus.publish.mock.calls[0][1]?.request).toBe(request);
    });

    it('defaults `occurredAt` to the current ISO timestamp when omitted', () => {
      publisher.emitEpisodeAssigned(request, {
        groupHash: 'group-hash-1',
        episodeId: 'episode-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        assigneeUid: 'user-uid-1',
        actorUid: 'actor-uid-1',
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ occurredAt: '2026-01-01T00:00:00.000Z' }),
        { request }
      );
    });

    it('preserves a null assigneeUid in the payload (unassign case)', () => {
      publisher.emitEpisodeAssigned(request, {
        groupHash: 'group-hash-1',
        episodeId: 'episode-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        assigneeUid: null,
        actorUid: 'actor-uid-1',
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { assigneeUid: null } }),
        { request }
      );
    });

    it('preserves a null actorUid on the envelope (internal / system actor case)', () => {
      publisher.emitEpisodeAssigned(request, {
        groupHash: 'group-hash-1',
        episodeId: 'episode-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        assigneeUid: 'user-uid-1',
        actorUid: null,
      });

      expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ actorUid: null }), {
        request,
      });
    });

    it('uses the request supplied per emit call (publisher is request-agnostic across invocations)', () => {
      const otherRequest = httpServerMock.createKibanaRequest();

      publisher.emitEpisodeAssigned(request, {
        groupHash: 'group-hash-1',
        episodeId: 'episode-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        assigneeUid: 'user-uid-1',
        actorUid: 'actor-uid-1',
      });

      publisher.emitEpisodeAssigned(otherRequest, {
        groupHash: 'group-hash-2',
        episodeId: 'episode-2',
        ruleId: 'rule-2',
        spaceId: 'default',
        assigneeUid: 'user-uid-2',
        actorUid: 'actor-uid-2',
      });

      expect(eventBus.publish).toHaveBeenCalledTimes(2);
      expect(eventBus.publish.mock.calls[0][1]?.request).toBe(request);
      expect(eventBus.publish.mock.calls[1][1]?.request).toBe(otherRequest);
    });
  });
});
