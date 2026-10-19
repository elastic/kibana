/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaTarget } from './kibana_client';
import { API, kbn } from './kibana_client';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface TaskStatusResponse {
  statuses: Record<string, string>;
  counts: Record<string, number>;
}

export const taskStatus = async (
  target: KibanaTarget,
  ids: string[],
  countTaskTypes: string[] = []
): Promise<TaskStatusResponse> => {
  const res = await kbn<TaskStatusResponse>(target, 'POST', `${API}/tasks/_status`, {
    ids,
    countTaskTypes,
  });
  if (res.status !== 200)
    throw new Error(
      `tasks/_status failed: ${res.status} ${JSON.stringify(res.body).slice(0, 300)}`
    );
  return res.body;
};

export const taskOutcomes = async (
  target: KibanaTarget,
  ids: string[]
): Promise<Record<string, 'success' | 'failed'>> => {
  const res = await kbn<{ outcomes: Record<string, 'success' | 'failed'> }>(
    target,
    'POST',
    `${API}/tasks/_outcome`,
    { ids }
  );
  if (res.status !== 200) throw new Error(`tasks/_outcome failed: ${res.status}`);
  return res.body.outcomes;
};

/**
 * Waits until every task id has **positive terminal-success evidence**: a TM TASK_RUN event with
 * ok=true for that id (pushed by whichever pod ran it). Disappearance from TM is not success —
 * TM also deletes exhausted failed tasks. Throws on a failed outcome, a status error, or timeout,
 * so a phase can never silently overlap the next one or pass with a failed treatment.
 */
export const awaitTasks = async (
  target: KibanaTarget,
  ids: string[],
  timeoutMs: number
): Promise<{ completedAt: number; waitedMs: number }> => {
  const t0 = Date.now();
  let goneAt: number | undefined;
  for (;;) {
    const { statuses } = await taskStatus(target, ids);
    const errored = ids.filter(
      (id) => statuses[id] === 'failed' || String(statuses[id]).startsWith('error')
    );
    if (errored.length)
      throw new Error(`tasks failed: ${errored.map((id) => `${id}=${statuses[id]}`).join(',')}`);
    const gone = ids.filter((id) => statuses[id] === 'done');
    if (gone.length === ids.length) {
      goneAt = goneAt ?? Date.now();
      const outcomes = await taskOutcomes(target, ids);
      const failed = ids.filter((id) => outcomes[id] === 'failed');
      if (failed.length) throw new Error(`tasks reported failure: ${failed.join(',')}`);
      if (ids.every((id) => outcomes[id] === 'success'))
        return { completedAt: goneAt, waitedMs: goneAt - t0 };
      // Success events arrive via the 2 s push path; allow a bounded grace period.
      if (Date.now() - goneAt > 30000)
        throw new Error(
          `tasks gone without success evidence: ${ids.filter((id) => !outcomes[id]).join(',')}`
        );
    }
    if (Date.now() - t0 > timeoutMs)
      throw new Error(`timeout after ${timeoutMs} ms waiting for tasks: ${ids.join(',')}`);
    await sleep(500);
  }
};

/** Waits until no tasks of the given types remain (e.g. action fan-out drained). */
export const awaitDrained = async (
  target: KibanaTarget,
  taskTypes: string[],
  timeoutMs: number
): Promise<{ completedAt: number; waitedMs: number }> => {
  const t0 = Date.now();
  for (;;) {
    const { counts } = await taskStatus(target, [], taskTypes);
    const remaining = Object.values(counts).reduce((a, b) => a + b, 0);
    if (remaining === 0) return { completedAt: Date.now(), waitedMs: Date.now() - t0 };
    if (Date.now() - t0 > timeoutMs)
      throw new Error(`timeout after ${timeoutMs} ms: ${JSON.stringify(counts)} still queued`);
    await sleep(1000);
  }
};
