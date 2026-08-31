/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER } from '@kbn/workflows-extensions/server';
import type { SignificantEventsServer } from '../../types';
import { createInMemoryRunQuotaRepository } from '../run_quotas/in_memory_repository.test_utils';
import { internalRunQuotaRoutes } from '../../routes/internal/run_quotas/route';

jest.mock('../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const consumeRoute =
  internalRunQuotaRoutes['POST /internal/significant_events/run_quotas/_consume'];

const createGateParams = (getCost: jest.Mock) => {
  const repository = createInMemoryRunQuotaRepository();
  const executions = new Map([
    [
      'child-1',
      {
        id: 'child-1',
        workflowId: SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
        spaceId: 'space-a',
        status: ExecutionStatus.RUNNING,
        context: {
          parentWorkflowExecutionId: 'parent-1',
          inputs: { quotaSlot: 1 },
        },
      },
    ],
    [
      'parent-1',
      {
        id: 'parent-1',
        workflowId: `${SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID}-space-a`,
        spaceId: 'space-a',
        status: ExecutionStatus.RUNNING,
        triggeredBy: 'scheduled',
        taskRunAt: '2026-08-31T10:00:00.000Z',
      },
    ],
  ]);
  const mget = jest.fn(async ({ docs }: { docs: Array<{ _id: string }> }) => ({
    docs: docs.map(({ _id }) => ({
      found: executions.has(_id),
      _source: executions.get(_id),
    })),
  }));
  const request = {
    headers: {
      [EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER]: 'child-1',
    },
  } as unknown as KibanaRequest;
  const server = {
    core: {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue(repository.client),
      },
    },
  } as unknown as SignificantEventsServer;

  return {
    params: {
      query: { group: 'detection' as const },
      body: { executionId: 'child-1' },
    },
    request,
    server,
    getScopedClients: jest.fn().mockResolvedValue({
      licensing: {},
      scopedClusterClient: { asInternalUser: { mget } },
    }),
    getSpaceId: jest.fn().mockResolvedValue('space-a'),
    logger: { get: jest.fn().mockReturnValue({ warn: jest.fn() }) },
    costService: { getCost, invalidate: jest.fn() },
  };
};

describe('run-cap gate isolation from cost services', () => {
  it('keeps all gate route source free of cost-library imports', () => {
    const routeSource = readFileSync(
      join(__dirname, '../../routes/internal/run_quotas/route.ts'),
      'utf8'
    );

    expect(routeSource).not.toMatch(/lib\/cost|\/cost\//);
  });

  it.each([
    ['failing', jest.fn().mockRejectedValue(new Error('price unavailable'))],
    ['hanging', jest.fn(() => new Promise(() => undefined))],
  ])('completes the consume gate with a %s cost service', async (_state, getCost) => {
    await expect(consumeRoute.handler(createGateParams(getCost) as never)).resolves.toEqual({
      allowed: true,
    });
    expect(getCost).not.toHaveBeenCalled();
  });
});
