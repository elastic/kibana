/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// RESEARCH ONLY (workload isolation harness, never merge): publishes Task Manager
// lifecycle timings to a diagnostics_channel so the research plugin can record poll /
// claim / run / discovery-heartbeat cadence without changing Task Manager behaviour.
import diagnosticsChannel from 'diagnostics_channel';
import type { TaskLifecycleEvent } from '../polling_lifecycle';
import { TaskEventType } from '../task_events';

const channel = diagnosticsChannel.channel('kbn:research:task_manager');

const PUBLISHED = new Set<string>([
  TaskEventType.TASK_POLLING_CYCLE,
  TaskEventType.TASK_RUN,
  TaskEventType.TASK_CLAIM,
  TaskEventType.TASK_MARK_RUNNING,
]);

export const publishResearchTaskEvent = (event: TaskLifecycleEvent): void => {
  if (!channel.hasSubscribers || !PUBLISHED.has(event.type)) return;
  const result = event.event as { tag: string; value?: Record<string, unknown> };
  const ok = result.tag === 'ok';
  const value = ok ? result.value : undefined;
  const stats = event.type === TaskEventType.TASK_POLLING_CYCLE ? value?.stats : undefined;
  let taskType: unknown;
  if (event.type === TaskEventType.TASK_RUN && value) {
    taskType = (value.task as { taskType?: string } | undefined)?.taskType;
  }
  channel.publish({
    tm_event: event.type,
    ok,
    task_id: event.type === TaskEventType.TASK_POLLING_CYCLE ? undefined : event.id,
    task_type: taskType,
    timing_start: event.timing?.start,
    timing_stop: event.timing?.stop,
    event_loop_block_ms: event.timing?.eventLoopBlockMs,
    stats,
  });
};

export const publishResearchDiscoveryHeartbeat = (ok: boolean, lastSeen: string): void => {
  if (!channel.hasSubscribers) return;
  channel.publish({ tm_event: 'DISCOVERY_HEARTBEAT', ok, last_seen: lastSeen });
};
