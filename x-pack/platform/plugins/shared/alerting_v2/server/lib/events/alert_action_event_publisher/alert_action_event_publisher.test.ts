/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventBus } from '../event_bus';
import type { AlertingDomainEvent } from '../domain_events';
import { createAlertActionEventPublisher } from './alert_action_event_publisher.mock';
import type { AlertActionEventPublisher } from './alert_action_event_publisher';
import { EPISODE_ASSIGNED_EVENT_TYPE } from './events';

describe('AlertActionEventPublisher', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

  let publisher: AlertActionEventPublisher;
  let eventBus: jest.Mocked<EventBus<AlertingDomainEvent>>;

  beforeEach(() => {
    ({ publisher, eventBus } = createAlertActionEventPublisher());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('emitEpisodeAssigned', () => {
    it('publishes an `episode.assigned` event with the canonical envelope and payload shape', () => {
      publisher.emitEpisodeAssigned({
        groupHash: 'group-hash-1',
        episodeId: 'episode-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        assigneeUid: 'user-uid-1',
        actorUid: 'actor-uid-1',
        occurredAt: '2025-02-02T12:34:56.000Z',
      });

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith({
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
      });
    });

    it('defaults `occurredAt` to the current ISO timestamp when omitted', () => {
      publisher.emitEpisodeAssigned({
        groupHash: 'group-hash-1',
        episodeId: 'episode-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        assigneeUid: 'user-uid-1',
        actorUid: 'actor-uid-1',
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ occurredAt: '2026-01-01T00:00:00.000Z' })
      );
    });

    it('preserves a null assigneeUid in the payload (unassign case)', () => {
      publisher.emitEpisodeAssigned({
        groupHash: 'group-hash-1',
        episodeId: 'episode-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        assigneeUid: null,
        actorUid: 'actor-uid-1',
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { assigneeUid: null } })
      );
    });

    it('preserves a null actorUid on the envelope (internal / system actor case)', () => {
      publisher.emitEpisodeAssigned({
        groupHash: 'group-hash-1',
        episodeId: 'episode-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        assigneeUid: 'user-uid-1',
        actorUid: null,
      });

      expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ actorUid: null }));
    });
  });
});
