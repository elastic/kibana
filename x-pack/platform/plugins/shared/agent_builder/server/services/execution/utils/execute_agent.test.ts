/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, toArray } from 'rxjs';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { executeAgent$ } from './execute_agent';

describe('executeAgent$', () => {
  it('passes the root execution to the runner as an internal option, not a run param', async () => {
    const runAgent = jest.fn().mockResolvedValue({ result: {} });

    await lastValueFrom(
      executeAgent$({
        agentId: 'agent-1',
        executionId: 'exec-1',
        request: httpServerMock.createKibanaRequest(),
        nextInput: { message: 'hi' },
        runAgent,
        rootExecutionId: 'root-1',
      }).pipe(toArray())
    );

    expect(runAgent).toHaveBeenCalledWith(
      expect.not.objectContaining({ rootExecutionId: expect.anything() }),
      { rootExecutionId: 'root-1' }
    );
  });
});
