/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_EXECUTION_FAILED_ERROR_MAX_LENGTH } from '../../../../../common/workflows/triggers';
import {
  RULE_EXECUTION_FAILED_EVENT_TYPE,
  type RuleExecutionFailedEvent,
} from '../../rule_executor_event_publisher/events';
import { ruleExecutionFailedTrigger } from './rule_execution_failed';

const baseEvent: RuleExecutionFailedEvent = {
  type: RULE_EXECUTION_FAILED_EVENT_TYPE,
  payload: {
    rule: { id: 'rule-1', spaceId: 'space-1' },
    error: 'Something went wrong',
  },
};

describe('ruleExecutionFailedTrigger', () => {
  it('subscribes to its own event type and registers the matching trigger id', () => {
    expect(ruleExecutionFailedTrigger.eventType).toBe(RULE_EXECUTION_FAILED_EVENT_TYPE);
    expect(ruleExecutionFailedTrigger.definition.id).toBe(ruleExecutionFailedTrigger.triggerId);
  });

  describe('toPayload', () => {
    it('maps the bus payload to { rule: { id, spaceId }, error }', () => {
      const result = ruleExecutionFailedTrigger.toPayload(baseEvent);

      expect(result).toEqual({
        rule: { id: 'rule-1', spaceId: 'space-1' },
        error: 'Something went wrong',
      });
    });

    it('always emits (never gates)', () => {
      expect(ruleExecutionFailedTrigger.toPayload(baseEvent)).not.toBeNull();
    });

    it('truncates an over-long error message to the schema bound so the payload stays valid', () => {
      const longError = 'x'.repeat(RULE_EXECUTION_FAILED_ERROR_MAX_LENGTH + 500);

      const result = ruleExecutionFailedTrigger.toPayload({
        ...baseEvent,
        payload: { ...baseEvent.payload, error: longError },
      });

      expect(result?.error).toHaveLength(RULE_EXECUTION_FAILED_ERROR_MAX_LENGTH);
      expect(() => ruleExecutionFailedTrigger.definition.eventSchema.parse(result)).not.toThrow();
    });
  });

  describe('schema ↔ payload agreement (drift detection)', () => {
    it('produces a payload that parses cleanly against the registered Zod schema', () => {
      const payload = ruleExecutionFailedTrigger.toPayload(baseEvent);
      const parsed = ruleExecutionFailedTrigger.definition.eventSchema.parse(payload);

      expect(parsed).toEqual(payload);
    });

    it('rejects a payload missing the required `error` field', () => {
      expect(() =>
        ruleExecutionFailedTrigger.definition.eventSchema.parse({
          rule: { id: 'rule-1', spaceId: 'space-1' },
        })
      ).toThrow();
    });
  });
});
