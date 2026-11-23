/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { EventLoopBlock, EventLoopBlockContexts } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { logEventLoopBlocks } from './log_event_loop_blocks';

const task = { type: 'task manager', name: 'run alerting:example', id: 'task-1' };
const otherTask = { type: 'task manager', name: 'run actions:example', id: 'task-2' };

describe('logEventLoopBlocks', () => {
  let blocks$: Subject<EventLoopBlock>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const block = (blockedMs: number, contexts?: EventLoopBlockContexts): EventLoopBlock => ({
    startedAt: 1_700_000_000_000,
    blockedMs,
    phase: 'running',
    ...(contexts ? { contexts } : {}),
  });

  beforeEach(() => {
    blocks$ = new Subject();
    logger = loggingSystemMock.createLogger();
    logEventLoopBlocks({ blocks$, logger, warnThresholdMs: 5_000 });
  });

  it('logs a long block against the task most of its samples found running', () => {
    blocks$.next(
      block(5_200, {
        samples: 10,
        withoutContext: 1,
        top: [
          { context: task, samples: 8 },
          { context: otherTask, samples: 1 },
        ],
      })
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'event loop blocked for 5200 ms by task alerting:example task-1 (8 of 10 samples)',
      { tags: ['alerting:example', 'alerting:example task-1', 'event-loop-blocked-by-task'] }
    );
  });

  it('logs a block at the threshold', () => {
    blocks$.next(
      block(5_000, { samples: 8, withoutContext: 0, top: [{ context: task, samples: 8 }] })
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("doesn't log a block shorter than the threshold", () => {
    blocks$.next(
      block(4_999, { samples: 8, withoutContext: 0, top: [{ context: task, samples: 8 }] })
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("doesn't log a block whose execution context wasn't sampled", () => {
    blocks$.next(block(60_000));
    blocks$.next(block(60_000, { samples: 3, withoutContext: 3, top: [] }));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("doesn't log a block that no single task held most of", () => {
    blocks$.next(
      block(10_000, {
        samples: 10,
        withoutContext: 0,
        top: [
          { context: task, samples: 7 },
          { context: otherTask, samples: 3 },
        ],
      })
    );
    blocks$.next(
      block(10_000, { samples: 10, withoutContext: 3, top: [{ context: task, samples: 7 }] })
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("doesn't log a block that ran outside a task", () => {
    blocks$.next(
      block(10_000, {
        samples: 10,
        withoutContext: 0,
        top: [{ context: { type: 'application', name: 'discover', id: 'abc' }, samples: 10 }],
      })
    );
    blocks$.next(
      block(10_000, {
        samples: 10,
        withoutContext: 0,
        top: [{ context: { type: 'task manager' }, samples: 10 }],
      })
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('stops logging once unsubscribed', () => {
    const other$ = new Subject<EventLoopBlock>();
    const subscription = logEventLoopBlocks({ blocks$: other$, logger, warnThresholdMs: 5_000 });
    subscription.unsubscribe();
    other$.next(
      block(6_000, { samples: 8, withoutContext: 0, top: [{ context: task, samples: 8 }] })
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
