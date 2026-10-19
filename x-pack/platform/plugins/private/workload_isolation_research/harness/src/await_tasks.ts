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

/**
 * Waits until every task id is done (one-shot tasks are deleted on success). Throws on a failed
 * task or on timeout, so a phase can never silently overlap the next one.
 */
export const awaitTasks = async (
  target: KibanaTarget,
  ids: string[],
  timeoutMs: number
): Promise<{ completedAt: number; waitedMs: number }> => {
  const t0 = Date.now();
  for (;;) {
    const { statuses } = await taskStatus(target, ids);
    const pending = ids.filter((id) => statuses[id] !== 'done');
    const failed = ids.filter(
      (id) => statuses[id] === 'failed' || String(statuses[id]).startsWith('error')
    );
    if (failed.length)
      throw new Error(`tasks failed: ${failed.map((id) => `${id}=${statuses[id]}`).join(',')}`);
    if (!pending.length) return { completedAt: Date.now(), waitedMs: Date.now() - t0 };
    if (Date.now() - t0 > timeoutMs)
      throw new Error(`timeout after ${timeoutMs} ms waiting for tasks: ${pending.join(',')}`);
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
