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
import { EPISODE_ASSIGNED_EVENT_TYPE } from './events';

const createAssignAction = (overrides: Partial<AlertAction> = {}): AlertAction => ({
  '@timestamp': '2025-02-02T12:34:56.000Z',
  group_hash: 'group-hash-1',
  episode_id: 'episode-1',
  rule_id: 'rule-1',
  space_id: 'default',
  actor: 'actor-uid-1',
  assignee_uid: 'user-uid-1',
  action_type: 'assign',
  last_series_event_timestamp: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

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
      publisher.emitEpisodeAssigned(request, createAssignAction());

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
      expect(eventBus.publish.mock.calls[0][1]?.request).toBe(request);
    });

    it('defaults `occurredAt` to the current ISO timestamp when omitted on the action', () => {
      publisher.emitEpisodeAssigned(
        request,
        createAssignAction({ '@timestamp': undefined as unknown as string })
      );

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ occurredAt: '2026-01-01T00:00:00.000Z' }),
        { request }
      );
    });

    it('no-ops when assignee_uid is null (unassign case)', () => {
      publisher.emitEpisodeAssigned(request, createAssignAction({ assignee_uid: null }));

      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('preserves a null actor on the envelope (internal / system actor case)', () => {
      publisher.emitEpisodeAssigned(request, createAssignAction({ actor: null }));

      expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ actorUid: null }), {
        request,
      });
    });

    it('uses the request supplied per emit call (publisher is request-agnostic across invocations)', () => {
      const otherRequest = httpServerMock.createKibanaRequest();

      publisher.emitEpisodeAssigned(request, createAssignAction());
      publisher.emitEpisodeAssigned(
        otherRequest,
        createAssignAction({
          group_hash: 'group-hash-2',
          episode_id: 'episode-2',
          rule_id: 'rule-2',
          assignee_uid: 'user-uid-2',
          actor: 'actor-uid-2',
        })
      );

      expect(eventBus.publish).toHaveBeenCalledTimes(2);
      expect(eventBus.publish.mock.calls[0][1]?.request).toBe(request);
      expect(eventBus.publish.mock.calls[1][1]?.request).toBe(otherRequest);
    });
  });

  describe('emitEpisodeActions', () => {
    it('dispatches only actions that publish domain events across a batch', () => {
      publisher.emitEpisodeActions(request, [
        createAssignAction(),
        createAssignAction({
          '@timestamp': '2025-02-02T12:34:57.000Z',
          group_hash: 'group-hash-2',
          episode_id: 'episode-2',
          rule_id: 'rule-2',
          actor: 'actor-uid-2',
          action_type: 'ack',
        }),
      ]);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EPISODE_ASSIGNED_EVENT_TYPE,
          episodeId: 'episode-1',
        }),
        { request }
      );
    });
  });
});
