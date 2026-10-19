/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaTarget } from './kibana_client';
import { API, kbn } from './kibana_client';
import { taskOutcomes } from './await_tasks';

/** Requires both worker-exit termination evidence and TM failure; never treats failure as success. */
export const awaitExpectedTermination = async (
  target: KibanaTarget,
  taskId: string,
  runId: string,
  timeoutMs: number
): Promise<{ completedAt: number; terminal: Record<string, unknown> }> => {
  const start = Date.now();
  let terminal: Record<string, unknown> | undefined;
  while (Date.now() - start < timeoutMs) {
    let searchAfter: unknown[] | null = null;
    for (let page = 0; page < 100; page++) {
      const response: {
        status: number;
        body: { hits: Array<Record<string, unknown>>; last_sort: unknown[] | null };
      } = await kbn(target, 'POST', `${API}/samples_es`, {
        from: start - 5000,
        to: Date.now() + 1000,
        size: 5000,
        ...(searchAfter ? { searchAfter } : {}),
      });
      if (response.status !== 200) throw new Error('Termination export failed');
      terminal =
        terminal ??
        response.body.hits.find(
          (doc) =>
            doc.source === 'offender_terminal' && doc.task_id === taskId && doc.run_id === runId
        );
      searchAfter = response.body.last_sort;
      if (!response.body.hits.length || !searchAfter) break;
    }
    if (terminal) {
      if (
        terminal.outcome !== 'terminated' ||
        terminal.collateral !== false ||
        terminal.discarded_runs !== 1
      )
        throw new Error('Expected one independently terminated worker run without collateral');
      const outcomes = await taskOutcomes(target, [taskId]);
      if (outcomes[taskId] === 'success')
        throw new Error('Terminated task incorrectly reported success');
      if (outcomes[taskId] === 'failed') return { completedAt: Number(terminal.end), terminal };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No positive worker termination and TM failure evidence for ${taskId}`);
};
