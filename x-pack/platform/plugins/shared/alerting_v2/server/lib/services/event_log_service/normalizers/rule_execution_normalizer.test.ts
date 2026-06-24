/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { normalizeRuleExecution } from './rule_execution_normalizer';

const HIT_ID = 'tEv0XJUBd-rfxabc1234'; // shaped like an ES auto-generated _id

const buildRawEvent = (overrides: Partial<NonNullable<IValidatedEvent>> = {}): IValidatedEvent => {
  return {
    '@timestamp': '2026-06-23T10:00:00.000Z',
    event: {
      provider: 'taskManager',
      action: 'task-run',
      outcome: 'success',
      start: '2026-06-23T09:59:50.000Z',
      end: '2026-06-23T10:00:00.000Z',
      duration: 10_000_000_000, // 10s in ns
    },
    kibana: {
      task: {
        id: 'alerting_v2:rule_executor:default:rule-1',
        type: 'alerting_v2:rule_executor',
        scheduled: '2026-06-23T09:59:45.000Z',
        schedule_delay: 5_000_000_000, // 5s in ns
      },
      server_uuid: 'srv-1',
    },
    ...overrides,
  } as IValidatedEvent;
};

describe('normalizeRuleExecution', () => {
  it('projects a well-formed task-run event into a RuleExecution, using the hit id as the execution id', () => {
    const result = normalizeRuleExecution(HIT_ID, buildRawEvent());
    expect(result).toEqual({
      id: HIT_ID,
      rule: { id: 'rule-1' },
      spaceId: 'default',
      startedAt: '2026-06-23T09:59:50.000Z',
      endedAt: '2026-06-23T10:00:00.000Z',
      timings: { duration: 10_000, scheduledDelay: 5_000 },
      outcome: 'success',
      reason: null,
      error: null,
    });
  });

  it('returns null when the hit id is missing', () => {
    expect(normalizeRuleExecution(undefined, buildRawEvent())).toBeNull();
    expect(normalizeRuleExecution('', buildRawEvent())).toBeNull();
  });

  it('passes event.reason through verbatim (task manager writes a formatted message for cancelled runs)', () => {
    const result = normalizeRuleExecution(
      HIT_ID,
      buildRawEvent({
        event: {
          provider: 'taskManager',
          action: 'task-run',
          outcome: 'success',
          start: '2026-06-23T09:59:50.000Z',
          end: '2026-06-23T10:00:00.000Z',
          duration: 1_000_000_000,
          reason: 'Task "alerting_v2:rule_executor:default:rule-1" was cancelled.',
        },
      })
    );
    expect(result?.reason).toBe('Task "alerting_v2:rule_executor:default:rule-1" was cancelled.');
  });

  it('projects error.message and error.stack_trace into a non-null error object when present', () => {
    const result = normalizeRuleExecution(
      HIT_ID,
      buildRawEvent({
        event: {
          provider: 'taskManager',
          action: 'task-run',
          outcome: 'failure',
          start: '2026-06-23T09:59:50.000Z',
          end: '2026-06-23T10:00:00.000Z',
          duration: 1_000_000_000,
        },
        error: { message: 'boom', stack_trace: 'Error: boom at foo' },
      })
    );
    expect(result?.outcome).toBe('failure');
    expect(result?.error).toEqual({ message: 'boom', stackTrace: 'Error: boom at foo' });
  });

  it('returns error: null when error.message is missing or empty', () => {
    const missing = normalizeRuleExecution(HIT_ID, buildRawEvent());
    expect(missing?.error).toBeNull();

    const emptyMessage = normalizeRuleExecution(
      HIT_ID,
      buildRawEvent({
        event: {
          provider: 'taskManager',
          action: 'task-run',
          outcome: 'failure',
          start: '2026-06-23T09:59:50.000Z',
          end: '2026-06-23T10:00:00.000Z',
          duration: 1_000_000_000,
        },
        error: { message: '', stack_trace: 'has trace but no message' },
      })
    );
    expect(emptyMessage?.error).toBeNull();
  });

  it('allows error.stackTrace to be null when message is present without a stack', () => {
    const result = normalizeRuleExecution(
      HIT_ID,
      buildRawEvent({
        event: {
          provider: 'taskManager',
          action: 'task-run',
          outcome: 'failure',
          start: '2026-06-23T09:59:50.000Z',
          end: '2026-06-23T10:00:00.000Z',
          duration: 1_000_000_000,
        },
        error: { message: 'boom' },
      })
    );
    expect(result?.error).toEqual({ message: 'boom', stackTrace: null });
  });

  it.each([
    ['missing task id', { kibana: { server_uuid: 'srv-1' } } as IValidatedEvent],
    [
      'wrong segment count',
      buildRawEvent({
        kibana: {
          task: {
            id: 'alerting_v2:rule_executor:default',
            type: 'alerting_v2:rule_executor',
          },
          server_uuid: 'srv-1',
        },
      }),
    ],
    [
      'wrong type prefix',
      buildRawEvent({
        kibana: {
          task: {
            id: 'something:else:default:rule-1',
            type: 'alerting_v2:rule_executor',
          },
          server_uuid: 'srv-1',
        },
      }),
    ],
  ])('returns null for malformed kibana.task.id (%s)', (_label, raw) => {
    const result = normalizeRuleExecution(HIT_ID, raw);
    expect(result).toBeNull();
  });

  it('returns null when event.start or event.end is missing', () => {
    expect(
      normalizeRuleExecution(
        HIT_ID,
        buildRawEvent({
          event: {
            provider: 'taskManager',
            action: 'task-run',
            outcome: 'success',
            duration: 1_000_000_000,
          },
        })
      )
    ).toBeNull();
  });

  it('returns null when event.outcome is not success/failure', () => {
    expect(
      normalizeRuleExecution(
        HIT_ID,
        buildRawEvent({
          event: {
            provider: 'taskManager',
            action: 'task-run',
            outcome: 'unknown',
            start: '2026-06-23T09:59:50.000Z',
            end: '2026-06-23T10:00:00.000Z',
            duration: 1_000_000_000,
          },
        })
      )
    ).toBeNull();
  });

  it('handles event.duration encoded as a string', () => {
    const result = normalizeRuleExecution(
      HIT_ID,
      buildRawEvent({
        event: {
          provider: 'taskManager',
          action: 'task-run',
          outcome: 'success',
          start: '2026-06-23T09:59:50.000Z',
          end: '2026-06-23T10:00:00.000Z',
          duration: '2500000000',
        },
        kibana: {
          task: {
            id: 'alerting_v2:rule_executor:default:rule-1',
            type: 'alerting_v2:rule_executor',
            schedule_delay: '500000000',
          },
          server_uuid: 'srv-1',
        },
      })
    );
    expect(result?.timings.duration).toBe(2500);
    expect(result?.timings.scheduledDelay).toBe(500);
  });

  it('falls back to 0 ms when duration or schedule_delay is missing', () => {
    const result = normalizeRuleExecution(
      HIT_ID,
      buildRawEvent({
        event: {
          provider: 'taskManager',
          action: 'task-run',
          outcome: 'success',
          start: '2026-06-23T09:59:50.000Z',
          end: '2026-06-23T10:00:00.000Z',
        },
        kibana: {
          task: {
            id: 'alerting_v2:rule_executor:default:rule-1',
            type: 'alerting_v2:rule_executor',
          },
          server_uuid: 'srv-1',
        },
      })
    );
    expect(result?.timings).toEqual({ duration: 0, scheduledDelay: 0 });
  });
});
