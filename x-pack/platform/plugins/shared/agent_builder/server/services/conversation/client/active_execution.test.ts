/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/agent-builder-common';
import type { NormalizedConversation } from './types';
import {
  ConversationBusySignal,
  applyActiveExecutionUpdate,
  isActiveExecutionUpdateNoop,
  isExecutionStale,
} from './active_execution';

const heldBy = (executionId: string, record?: NormalizedConversation['execution']) =>
  ({
    active_execution: { execution_id: executionId },
    ...(record ? { execution: record } : {}),
  } as NormalizedConversation);

const heartbeatAgo = (seconds: number) => ({
  status: ExecutionStatus.running,
  eventCount: 0,
  lastHeartbeat: new Date(Date.now() - seconds * 1000).toISOString(),
});

const free = {} as NormalizedConversation;

const set = { action: 'acquire', executionId: 'e2' } as const;

describe('applyActiveExecutionUpdate', () => {
  describe('setting', () => {
    it('sets the active execution on a free conversation', () => {
      expect(applyActiveExecutionUpdate(free, set)).toEqual({
        active_execution: { execution_id: 'e2' },
      });
    });

    it('refuses while a live execution holds the conversation', () => {
      let thrown: unknown;

      try {
        applyActiveExecutionUpdate(heldBy('e1', heartbeatAgo(0)), set);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ConversationBusySignal);
      expect((thrown as ConversationBusySignal).activeExecutionId).toBe('e1');
    });

    it('takes over a holder whose heartbeat went stale', () => {
      expect(applyActiveExecutionUpdate(heldBy('e1', heartbeatAgo(120)), set)).toEqual({
        active_execution: { execution_id: 'e2' },
      });
    });

    it('takes over a holder whose record is gone', () => {
      expect(applyActiveExecutionUpdate(heldBy('e1'), set)).toEqual({
        active_execution: { execution_id: 'e2' },
      });
    });

    it('keeps its own active execution', () => {
      expect(applyActiveExecutionUpdate(heldBy('e2'), set).active_execution).toMatchObject({
        execution_id: 'e2',
      });
    });
  });

  describe('releasing', () => {
    it('clears its own active execution', () => {
      expect(
        applyActiveExecutionUpdate(heldBy('e1'), { action: 'release', executionId: 'e1' })
      ).toEqual({
        active_execution: undefined,
      });
    });

    it('leaves a newer active execution alone', () => {
      expect(
        applyActiveExecutionUpdate(heldBy('e2'), { action: 'release', executionId: 'e1' })
      ).toEqual({});
    });
  });
});

describe('isActiveExecutionUpdateNoop', () => {
  it('is true without an update', () => {
    expect(isActiveExecutionUpdateNoop(heldBy('e1'))).toBe(true);
  });

  it('is true for a release that does not hold the active execution', () => {
    expect(
      isActiveExecutionUpdateNoop(heldBy('e2'), { action: 'release', executionId: 'e1' })
    ).toBe(true);
  });

  it('is false for a release that holds the active execution', () => {
    expect(
      isActiveExecutionUpdateNoop(heldBy('e1'), { action: 'release', executionId: 'e1' })
    ).toBe(false);
  });

  it('is false for a set', () => {
    expect(isActiveExecutionUpdateNoop(free, set)).toBe(false);
  });
});

describe('isExecutionStale', () => {
  const NOW = Date.parse('2026-10-28T12:00:00.000Z');

  const secondsAgo = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

  it('is stale when the execution record is gone', () => {
    expect(isExecutionStale(undefined, NOW)).toBe(true);
  });

  it.each([ExecutionStatus.completed, ExecutionStatus.failed, ExecutionStatus.aborted])(
    'is stale once the execution is %s',
    (status) => {
      expect(isExecutionStale({ status, eventCount: 0, lastHeartbeat: secondsAgo(0) }, NOW)).toBe(
        true
      );
    }
  );

  it('is live while a running execution keeps its heartbeat', () => {
    expect(
      isExecutionStale(
        { status: ExecutionStatus.running, eventCount: 0, lastHeartbeat: secondsAgo(30) },
        NOW
      )
    ).toBe(false);
  });

  it('is stale when a running execution misses its heartbeat', () => {
    expect(
      isExecutionStale(
        { status: ExecutionStatus.running, eventCount: 0, lastHeartbeat: secondsAgo(90) },
        NOW
      )
    ).toBe(true);
  });

  it('gives a scheduled execution time to be claimed', () => {
    expect(
      isExecutionStale(
        { status: ExecutionStatus.scheduled, eventCount: 0, lastHeartbeat: secondsAgo(90) },
        NOW
      )
    ).toBe(false);
  });

  it('is stale when a scheduled execution is never claimed', () => {
    expect(
      isExecutionStale(
        { status: ExecutionStatus.scheduled, eventCount: 0, lastHeartbeat: secondsAgo(6 * 60) },
        NOW
      )
    ).toBe(true);
  });

  it('is stale without a heartbeat', () => {
    expect(isExecutionStale({ status: ExecutionStatus.running, eventCount: 0 }, NOW)).toBe(true);
  });
});
