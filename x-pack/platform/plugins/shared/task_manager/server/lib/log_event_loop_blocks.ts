/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';
import type { EventLoopBlock, Logger } from '@kbn/core/server';
import { TASK_MANAGER_CONTEXT_TYPE } from './execution_context';

/** A block is logged against a task when at least this share of its samples found that task. */
export const MIN_TASK_SAMPLE_SHARE = 0.8;

export interface LogEventLoopBlocksOpts {
  /** Blocks reported by Core's event loop watchdog. */
  blocks$: Observable<EventLoopBlock>;
  logger: Logger;
  /** Shorter blocks are not logged. */
  warnThresholdMs: number;
}

/** Task runs set an execution context named `run <taskType>`; see the task runner. */
const toTaskType = (contextName: string): string => contextName.replace(/^run /, '');

/** Logs each long event loop block that Core's watchdog found a single task running in. */
export const logEventLoopBlocks = ({
  blocks$,
  logger,
  warnThresholdMs,
}: LogEventLoopBlocksOpts): Subscription =>
  blocks$.subscribe(({ blockedMs, contexts }) => {
    if (blockedMs < warnThresholdMs || !contexts) {
      return;
    }
    // Contexts are sorted by samples: only the first one can hold most of them. A task run is the
    // outer context, which is the one Core samples, so a task's samples are all in one entry.
    const [first] = contexts.top;
    if (!first || first.samples / contexts.samples < MIN_TASK_SAMPLE_SHARE) {
      return;
    }
    const { type, name, id } = first.context;
    if (type !== TASK_MANAGER_CONTEXT_TYPE || name === undefined || id === undefined) {
      return;
    }
    const taskType = toTaskType(name);
    const taskLabel = `${taskType} ${id}`;
    logger.warn(
      `event loop blocked for ${blockedMs} ms by task ${taskLabel} (${first.samples} of ${contexts.samples} samples)`,
      { tags: [taskType, taskLabel, 'event-loop-blocked-by-task'] }
    );
  });
