/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_EXECUTION_SUCCEEDED_EVENT_TYPE,
  type RuleExecutionSucceededEvent,
} from '../../rule_executor_event_publisher/events';
import { ruleEventsGeneratedTrigger } from './rule_events_generated';

const baseEvent: RuleExecutionSucceededEvent = {
  type: RULE_EXECUTION_SUCCEEDED_EVENT_TYPE,
  payload: {
    executionId: 'execution-uuid',
    scheduledAt: '2025-01-01T00:00:00.000Z',
    ruleEventsGenerated: 3,
    rule: {
      ruleId: 'rule-1',
      spaceId: 'default',
      kind: 'signal',
      tags: ['security', 'siem'],
    },
  },
};

describe('ruleEventsGeneratedTrigger', () => {
  it('subscribes to the rule.execution.succeeded event and registers the matching trigger id', () => {
    expect(ruleEventsGeneratedTrigger.eventType).toBe(RULE_EXECUTION_SUCCEEDED_EVENT_TYPE);
    expect(ruleEventsGeneratedTrigger.definition.id).toBe(ruleEventsGeneratedTrigger.triggerId);
  });

  describe('toPayload', () => {
    it('reshapes the flat bus payload into the nested workflow payload', () => {
      const result = ruleEventsGeneratedTrigger.toPayload(baseEvent);

      expect(result).toEqual({
        rule: {
          id: 'rule-1',
          spaceId: 'default',
          kind: 'signal',
          tags: ['security', 'siem'],
        },
        execution: {
          executionId: 'execution-uuid',
          scheduledAt: '2025-01-01T00:00:00.000Z',
        },
        ruleEventsGenerated: 3,
      });
    });

    it('copies tags into a fresh array (does not alias the event payload)', () => {
      const result = ruleEventsGeneratedTrigger.toPayload(baseEvent);

      expect(result?.rule.tags).not.toBe(baseEvent.payload.rule.tags);
      expect(result?.rule.tags).toEqual(['security', 'siem']);
    });

    it('returns null (gates emission) when the run produced no rule events', () => {
      expect(
        ruleEventsGeneratedTrigger.toPayload({
          ...baseEvent,
          payload: { ...baseEvent.payload, ruleEventsGenerated: 0 },
        })
      ).toBeNull();
    });
  });

  describe('schema ↔ payload agreement (drift detection)', () => {
    it('produces a payload that parses cleanly against the registered Zod schema', () => {
      const payload = ruleEventsGeneratedTrigger.toPayload(baseEvent);
      const parsed = ruleEventsGeneratedTrigger.definition.eventSchema.parse(payload);

      expect(parsed).toEqual(payload);
    });

    it('rejects a payload missing a required field', () => {
      const payload = ruleEventsGeneratedTrigger.toPayload(baseEvent);
      const { ruleEventsGenerated: _omitted, ...payloadMissingField } = payload!;

      expect(() =>
        ruleEventsGeneratedTrigger.definition.eventSchema.parse(payloadMissingField)
      ).toThrow();
    });
  });
});
