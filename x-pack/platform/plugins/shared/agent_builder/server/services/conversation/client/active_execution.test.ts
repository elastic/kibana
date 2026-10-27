/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NormalizedConversation } from './types';
import {
  ConversationBusySignal,
  applyActiveExecutionUpdate,
  isActiveExecutionUpdateNoop,
} from './active_execution';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const heldBy = (executionId: string, startedAt: string) =>
  ({
    active_execution: {
      execution_id: executionId,
      started_at: startedAt,
    },
  } as NormalizedConversation);

const free = {} as NormalizedConversation;

const set = { executionId: 'e2' };

describe('applyActiveExecutionUpdate', () => {
  describe('setting', () => {
    it('sets the active execution on a free conversation', () => {
      expect(applyActiveExecutionUpdate(free, set)).toEqual({
        active_execution: {
          execution_id: 'e2',
          started_at: expect.any(String),
        },
      });
    });

    it('refuses while another execution became active within the TTL', () => {
      let thrown: unknown;

      try {
        applyActiveExecutionUpdate(heldBy('e1', minutesAgo(4)), set);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ConversationBusySignal);
      expect((thrown as ConversationBusySignal).activeExecutionId).toBe('e1');
    });

    it('takes over an active execution older than the TTL', () => {
      expect(
        applyActiveExecutionUpdate(heldBy('e1', minutesAgo(6)), set).active_execution
      ).toMatchObject({ execution_id: 'e2' });
    });

    it('keeps its own active execution', () => {
      expect(
        applyActiveExecutionUpdate(heldBy('e2', minutesAgo(1)), set).active_execution
      ).toMatchObject({ execution_id: 'e2' });
    });
  });

  describe('releasing', () => {
    it('clears its own active execution', () => {
      expect(
        applyActiveExecutionUpdate(heldBy('e1', minutesAgo(1)), { releaseExecutionId: 'e1' })
      ).toEqual({ active_execution: undefined });
    });

    it('leaves a newer active execution alone', () => {
      expect(
        applyActiveExecutionUpdate(heldBy('e2', minutesAgo(1)), { releaseExecutionId: 'e1' })
      ).toEqual({});
    });
  });
});

describe('isActiveExecutionUpdateNoop', () => {
  it('is true for a release that does not hold the active execution', () => {
    expect(
      isActiveExecutionUpdateNoop(heldBy('e2', minutesAgo(1)), { releaseExecutionId: 'e1' })
    ).toBe(true);
  });

  it('is false for a release that holds the active execution', () => {
    expect(
      isActiveExecutionUpdateNoop(heldBy('e1', minutesAgo(1)), { releaseExecutionId: 'e1' })
    ).toBe(false);
  });

  it('is false for a set', () => {
    expect(isActiveExecutionUpdateNoop(free, set)).toBe(false);
  });
});
