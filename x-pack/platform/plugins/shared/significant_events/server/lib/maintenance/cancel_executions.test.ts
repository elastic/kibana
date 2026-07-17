/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import { cancelTargetExecutions } from './cancel_executions';

type ManagementApi = WorkflowsServerPluginSetup['management'];

const REQUEST = { headers: {} } as KibanaRequest;
const TARGET = { id: 'wf', spaceId: 'default' };

interface ExecutionsPage {
  results: Array<{ id: string }>;
  total: number;
}

/** Returns scripted execution pages in call order, then empty pages forever. */
const scriptExecutions = (pages: ExecutionsPage[]) => {
  let call = 0;
  return jest.fn(async () => pages[call++] ?? { results: [], total: 0 });
};

const makeMgmt = ({
  getWorkflowExecutions,
  failCancelIds = [],
}: {
  getWorkflowExecutions: jest.Mock;
  failCancelIds?: string[];
}) => {
  const failed = new Set(failCancelIds);
  const cancelWorkflowExecution = jest.fn(async (executionId: string) => {
    if (failed.has(executionId)) {
      throw new Error(`cancel failed for ${executionId}`);
    }
  });
  return {
    mgmt: { getWorkflowExecutions, cancelWorkflowExecution } as unknown as ManagementApi,
    getWorkflowExecutions,
    cancelWorkflowExecution,
  };
};

describe('cancelTargetExecutions', () => {
  it('cancels every non-terminal execution found in a single page', async () => {
    const { mgmt, cancelWorkflowExecution } = makeMgmt({
      getWorkflowExecutions: scriptExecutions([
        { results: [{ id: 'e1' }, { id: 'e2' }], total: 2 },
      ]),
    });
    const failures: SignificantEventsMaintenanceFailure[] = [];

    const cancelled = await cancelTargetExecutions(mgmt, TARGET, REQUEST, failures);

    expect(cancelled).toBe(2);
    expect(cancelWorkflowExecution).toHaveBeenCalledWith('e1', 'default', REQUEST);
    expect(cancelWorkflowExecution).toHaveBeenCalledWith('e2', 'default', REQUEST);
    expect(failures).toEqual([]);
  });

  it('drains an execution that only surfaces on the pass-2 re-check (status lag)', async () => {
    const { mgmt, cancelWorkflowExecution } = makeMgmt({
      getWorkflowExecutions: scriptExecutions([
        { results: [{ id: 'e1' }], total: 1 }, // pass 1
        { results: [{ id: 'e2' }], total: 1 }, // pass 2: a late arrival
        { results: [{ id: 'e2' }], total: 1 }, // pass 2: already attempted -> drained
      ]),
    });
    const failures: SignificantEventsMaintenanceFailure[] = [];

    const cancelled = await cancelTargetExecutions(mgmt, TARGET, REQUEST, failures);

    expect(cancelled).toBe(2);
    expect(cancelWorkflowExecution).toHaveBeenCalledWith('e2', 'default', REQUEST);
    expect(failures).toEqual([]);
  });

  it('does not report a backlog when a successfully-cancelled execution briefly reappears', async () => {
    const { mgmt } = makeMgmt({
      getWorkflowExecutions: scriptExecutions([
        { results: [{ id: 'e1' }], total: 1 }, // pass 1: cancel succeeds
        { results: [{ id: 'e1' }], total: 1 }, // pass 2: same id lingers (status lag)
      ]),
    });
    const failures: SignificantEventsMaintenanceFailure[] = [];

    const cancelled = await cancelTargetExecutions(mgmt, TARGET, REQUEST, failures);

    expect(cancelled).toBe(1);
    expect(failures).toEqual([]);
  });

  it('records a backlog failure when a failed cancel keeps the execution non-terminal', async () => {
    const { mgmt } = makeMgmt({
      getWorkflowExecutions: scriptExecutions([
        { results: [{ id: 'stuck' }], total: 1 }, // pass 1: cancel fails
        { results: [{ id: 'stuck' }], total: 1 }, // pass 2: still there, nothing new to attempt
      ]),
      failCancelIds: ['stuck'],
    });
    const failures: SignificantEventsMaintenanceFailure[] = [];

    const cancelled = await cancelTargetExecutions(mgmt, TARGET, REQUEST, failures);

    expect(cancelled).toBe(0);
    expect(failures).toContainEqual({
      target: 'execution:stuck@default',
      error: expect.stringContaining('cancel failed for stuck'),
    });
    expect(failures).toContainEqual({
      target: 'execution-backlog:wf@default',
      error: expect.stringContaining('Cancel backlog not drained'),
    });
  });

  it('surfaces a failure and cancels nothing when the executions query throws', async () => {
    const { mgmt } = makeMgmt({
      getWorkflowExecutions: jest.fn(async () => {
        throw new Error('exec query down');
      }),
    });
    const failures: SignificantEventsMaintenanceFailure[] = [];

    const cancelled = await cancelTargetExecutions(mgmt, TARGET, REQUEST, failures);

    expect(cancelled).toBe(0);
    expect(failures).toContainEqual({
      target: 'execution:wf@default',
      error: expect.stringContaining('exec query down'),
    });
  });

  it('terminates the pass-2 loop at the round cap even if new executions keep arriving', async () => {
    // pass 1 returns one execution, then every re-check returns a brand-new id so
    // a cancel is always accepted; the loop must still stop at MAX_CANCEL_ROUNDS.
    let call = 0;
    const getWorkflowExecutions = jest.fn(async () => {
      call += 1;
      return { results: [{ id: call === 1 ? 'p1' : `r${call}` }], total: 1 };
    });
    const { mgmt } = makeMgmt({ getWorkflowExecutions });
    const failures: SignificantEventsMaintenanceFailure[] = [];

    const cancelled = await cancelTargetExecutions(mgmt, TARGET, REQUEST, failures);

    // 1 (pass 1) + 50 (capped pass-2 rounds).
    expect(cancelled).toBe(51);
    // 1 (pass 1) + 50 (rounds) + 1 (final backlog re-check).
    expect(getWorkflowExecutions).toHaveBeenCalledTimes(52);
    expect(failures).toEqual([]);
  });
});
