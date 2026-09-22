/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EPISODE_ASSIGNED_EVENT_TYPE,
  type EpisodeAssignedEvent,
} from '../../alert_action_event_publisher/events';
import { episodeAssignedTrigger } from './episode_assigned';

const baseEvent: EpisodeAssignedEvent = {
  type: EPISODE_ASSIGNED_EVENT_TYPE,
  occurredAt: '2025-02-02T12:34:56.000Z',
  groupHash: 'group-hash-1',
  episodeId: 'episode-1',
  ruleId: 'rule-1',
  spaceId: 'default',
  actorUid: 'actor-uid-1',
  payload: { assigneeUid: 'assignee-uid-1' },
};

describe('episodeAssignedTrigger', () => {
  describe('toPayload', () => {
    it('flattens the envelope and the `payload.assigneeUid` into a single schema-conforming object', () => {
      const result = episodeAssignedTrigger.toPayload(baseEvent);

      expect(result).toEqual({
        occurredAt: baseEvent.occurredAt,
        groupHash: baseEvent.groupHash,
        episodeId: baseEvent.episodeId,
        ruleId: baseEvent.ruleId,
        spaceId: baseEvent.spaceId,
        actorUid: baseEvent.actorUid,
        assigneeUid: baseEvent.payload.assigneeUid,
      });
    });

    it('preserves null `actorUid` (system-initiated assignment)', () => {
      const result = episodeAssignedTrigger.toPayload({
        ...baseEvent,
        actorUid: null,
      });

      expect(result.actorUid).toBeNull();
    });
  });

  describe('schema ↔ payload agreement (drift detection)', () => {
    it('produces a payload that parses cleanly against the registered Zod schema', () => {
      const payload = episodeAssignedTrigger.toPayload(baseEvent);
      const parsed = episodeAssignedTrigger.definition.eventSchema.parse(payload);

      expect(parsed).toEqual(payload);
    });

    it('rejects payloads with unknown fields (schema is .strict())', () => {
      const payloadWithExtra = {
        ...episodeAssignedTrigger.toPayload(baseEvent),
        somethingElse: 'should not be here',
      };

      expect(() => episodeAssignedTrigger.definition.eventSchema.parse(payloadWithExtra)).toThrow();
    });

    it('rejects payloads missing a required field', () => {
      const { ruleId: _omitted, ...payloadMissingRule } =
        episodeAssignedTrigger.toPayload(baseEvent);

      expect(() =>
        episodeAssignedTrigger.definition.eventSchema.parse(payloadMissingRule)
      ).toThrow();
    });
  });
});
