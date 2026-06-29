/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EPISODE_ACKED_EVENT_TYPE,
  EPISODE_ACTIVATED_EVENT_TYPE,
  EPISODE_DEACTIVATED_EVENT_TYPE,
  EPISODE_SNOOZED_EVENT_TYPE,
  EPISODE_TAGGED_EVENT_TYPE,
  EPISODE_UNACKED_EVENT_TYPE,
  EPISODE_UNASSIGNED_EVENT_TYPE,
  EPISODE_UNSNOOZED_EVENT_TYPE,
  type AlertActionEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { episodeAckedTrigger } from './episode_acked';
import { episodeActivatedTrigger } from './episode_activated';
import { episodeDeactivatedTrigger } from './episode_deactivated';
import { episodeSnoozedTrigger } from './episode_snoozed';
import { episodeTaggedTrigger } from './episode_tagged';
import { episodeUnackedTrigger } from './episode_unacked';
import { episodeUnassignedTrigger } from './episode_unassigned';
import { episodeUnsnoozedTrigger } from './episode_unsnoozed';

const envelope = {
  occurredAt: '2025-02-02T12:34:56.000Z',
  groupHash: 'group-hash-1',
  episodeId: 'episode-1',
  ruleId: 'rule-1',
  spaceId: 'default',
  actorUid: 'actor-uid-1',
} as const;

interface Case {
  name: string;
  trigger: AlertActionWorkflowTriggerBinding;
  event: AlertActionEvent;
  expectedExtra: Record<string, unknown>;
}

const cases: Case[] = [
  {
    name: 'episodeUnassignedTrigger',
    trigger: episodeUnassignedTrigger,
    event: { type: EPISODE_UNASSIGNED_EVENT_TYPE, ...envelope, payload: {} },
    expectedExtra: {},
  },
  {
    name: 'episodeAckedTrigger',
    trigger: episodeAckedTrigger,
    event: { type: EPISODE_ACKED_EVENT_TYPE, ...envelope, payload: {} },
    expectedExtra: {},
  },
  {
    name: 'episodeUnackedTrigger',
    trigger: episodeUnackedTrigger,
    event: { type: EPISODE_UNACKED_EVENT_TYPE, ...envelope, payload: {} },
    expectedExtra: {},
  },
  {
    name: 'episodeUnsnoozedTrigger',
    trigger: episodeUnsnoozedTrigger,
    event: { type: EPISODE_UNSNOOZED_EVENT_TYPE, ...envelope, payload: {} },
    expectedExtra: {},
  },
  {
    name: 'episodeTaggedTrigger',
    trigger: episodeTaggedTrigger,
    event: { type: EPISODE_TAGGED_EVENT_TYPE, ...envelope, payload: { tags: ['a', 'b'] } },
    expectedExtra: { tags: ['a', 'b'] },
  },
  {
    name: 'episodeSnoozedTrigger (with expiry)',
    trigger: episodeSnoozedTrigger,
    event: {
      type: EPISODE_SNOOZED_EVENT_TYPE,
      ...envelope,
      payload: { expiry: '2025-03-03T00:00:00.000Z' },
    },
    expectedExtra: { expiry: '2025-03-03T00:00:00.000Z' },
  },
  {
    name: 'episodeSnoozedTrigger (null expiry)',
    trigger: episodeSnoozedTrigger,
    event: { type: EPISODE_SNOOZED_EVENT_TYPE, ...envelope, payload: { expiry: null } },
    expectedExtra: { expiry: null },
  },
  {
    name: 'episodeActivatedTrigger',
    trigger: episodeActivatedTrigger,
    event: { type: EPISODE_ACTIVATED_EVENT_TYPE, ...envelope, payload: { reason: 'flapping' } },
    expectedExtra: { reason: 'flapping' },
  },
  {
    name: 'episodeDeactivatedTrigger',
    trigger: episodeDeactivatedTrigger,
    event: {
      type: EPISODE_DEACTIVATED_EVENT_TYPE,
      ...envelope,
      payload: { reason: 'maintenance' },
    },
    expectedExtra: { reason: 'maintenance' },
  },
];

describe('alert-action workflow trigger bindings', () => {
  describe.each(cases)('$name', ({ trigger, event, expectedExtra }) => {
    it('flattens the envelope (and any action-specific fields) into the payload', () => {
      expect(trigger.toPayload(event)).toEqual({ ...envelope, ...expectedExtra });
    });

    it('preserves a null actorUid (system-initiated action)', () => {
      const result = trigger.toPayload({ ...event, actorUid: null }) as Record<string, unknown>;
      expect(result.actorUid).toBeNull();
    });

    it('produces a payload that parses cleanly against the registered Zod schema', () => {
      const payload = trigger.toPayload(event);
      expect(trigger.definition.eventSchema.parse(payload)).toEqual(payload);
    });

    it('rejects payloads with unknown fields (schema is .strict())', () => {
      const payload = { ...trigger.toPayload(event), somethingElse: 'nope' };
      expect(() => trigger.definition.eventSchema.parse(payload)).toThrow();
    });
  });
});
