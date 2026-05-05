/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ActionPolicyClient } from '../../lib/action_policy_client/action_policy_client';
import type { RulesClient } from '../../lib/rules_client';
import type { EventLogServiceContract } from '../../lib/services/event_log_service/event_log_service';
import type { AlertingServerStartDependencies } from '../../types';
import { ACTION_POLICY_EVENT_ACTIONS } from '../../lib/dispatcher/steps/constants';
import { ACTION_POLICY_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { createRouteDependencies } from '../test_utils';
import { ListExecutionHistoryRoute } from './list_execution_history_route';

const buildEvent = ({
  policyId,
  ruleIds = [],
  workflowIds = [],
  episodeCount = 1,
  actionGroupCount = 1,
  action = ACTION_POLICY_EVENT_ACTIONS.DISPATCHED,
  timestamp = '2026-05-05T10:00:00.000Z',
}: {
  policyId: string;
  ruleIds?: string[];
  workflowIds?: string[];
  episodeCount?: number;
  actionGroupCount?: number;
  action?: 'dispatched' | 'throttled';
  timestamp?: string;
}) => ({
  '@timestamp': timestamp,
  event: { action, provider: 'alerting_v2' },
  kibana: {
    saved_objects: [
      { type: ACTION_POLICY_SAVED_OBJECT_TYPE, id: policyId },
      ...ruleIds.map((id) => ({ type: RULE_SAVED_OBJECT_TYPE, id })),
    ],
    alerting_v2: {
      dispatcher: {
        episode_count: episodeCount,
        action_group_count: actionGroupCount,
        workflow_ids: workflowIds,
      },
    },
  },
});

const buildPolicy = (id: string, name: string) => ({ id, name } as any);
const buildRule = (id: string, name: string) => ({ id, metadata: { name } } as any);
const buildWorkflow = (id: string, name: string) => ({ id, name } as any);

const createMocks = () => {
  const deps = createRouteDependencies();
  const eventLogService: jest.Mocked<EventLogServiceContract> = {
    logEvent: jest.fn(),
    findActionPolicyExecutionEvents: jest.fn(),
    countActionPolicyExecutionEventsSince: jest.fn(),
  };
  const actionPolicyClient = {
    getActionPolicies: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<ActionPolicyClient>;
  const rulesClient = {
    getRules: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<RulesClient>;
  const workflowsManagement = {
    getWorkflowsByIds: jest.fn().mockResolvedValue([]),
  };
  const spaces = {
    spacesService: {
      getSpaceId: jest.fn().mockReturnValue('default'),
    },
  } as unknown as AlertingServerStartDependencies['spaces'];

  return { deps, eventLogService, actionPolicyClient, rulesClient, workflowsManagement, spaces };
};

const buildRoute = (
  request: KibanaRequest,
  mocks: ReturnType<typeof createMocks>,
  serviceResult: {
    events?: unknown[];
    page?: number;
    perPage?: number;
    total?: number;
  } = {}
) => {
  mocks.eventLogService.findActionPolicyExecutionEvents.mockResolvedValue({
    events: [],
    page: 1,
    perPage: 100,
    total: 0,
    ...serviceResult,
  } as any);

  return new ListExecutionHistoryRoute(
    mocks.deps.ctx,
    request as any,
    mocks.eventLogService,
    mocks.actionPolicyClient,
    mocks.rulesClient,
    mocks.workflowsManagement as any,
    mocks.spaces
  );
};

describe('ListExecutionHistoryRoute', () => {
  it('forwards page, perPage and a 24h startDate to the event log service', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T11:00:00.000Z'));
    const mocks = createMocks();
    const request = httpServerMock.createKibanaRequest({ query: { page: 2, perPage: 25 } });
    const route = buildRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    expect(mocks.eventLogService.findActionPolicyExecutionEvents).toHaveBeenCalledWith({
      request,
      startDate: '2026-10-10T11:00:00.000Z',
      page: 2,
      perPage: 25,
    });

    jest.useRealTimers();
  });

  it('applies default page=1 and perPage=100 when query is empty', async () => {
    const mocks = createMocks();
    const request = httpServerMock.createKibanaRequest();
    const route = buildRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    const args = mocks.eventLogService.findActionPolicyExecutionEvents.mock.calls[0][0];
    expect(args.page).toBe(1);
    expect(args.perPage).toBe(100);
  });

  it('bulk-fetches policies, rules and workflows from event refs in parallel', async () => {
    const mocks = createMocks();
    const events = [buildEvent({ policyId: 'p-1', ruleIds: ['r-1'], workflowIds: ['w-1'] })];
    const request = httpServerMock.createKibanaRequest();
    const route = buildRoute(request as unknown as KibanaRequest, mocks, { events, total: 1 });

    await route.handle();

    expect(mocks.actionPolicyClient.getActionPolicies).toHaveBeenCalledWith({ ids: ['p-1'] });
    expect(mocks.rulesClient.getRules).toHaveBeenCalledWith(['r-1']);
    expect(mocks.workflowsManagement.getWorkflowsByIds).toHaveBeenCalledWith(['w-1'], 'default');
  });

  it('passes the request-scoped spaceId to the workflows lookup', async () => {
    const mocks = createMocks();
    (mocks.spaces.spacesService.getSpaceId as jest.Mock).mockReturnValue('my-space');
    const events = [buildEvent({ policyId: 'p-1', ruleIds: ['r-1'], workflowIds: ['w-1'] })];
    const request = httpServerMock.createKibanaRequest();
    const route = buildRoute(request as unknown as KibanaRequest, mocks, { events, total: 1 });

    await route.handle();

    expect(mocks.workflowsManagement.getWorkflowsByIds).toHaveBeenCalledWith(['w-1'], 'my-space');
    expect(mocks.spaces.spacesService.getSpaceId).toHaveBeenCalledWith(request);
  });

  it('populates response item names from the bulk-get results', async () => {
    const mocks = createMocks();
    const events = [buildEvent({ policyId: 'p-1', ruleIds: ['r-1'], workflowIds: ['w-1'] })];
    mocks.actionPolicyClient.getActionPolicies.mockResolvedValue([buildPolicy('p-1', 'Policy 1')]);
    mocks.rulesClient.getRules.mockResolvedValue([buildRule('r-1', 'Rule 1')]);
    mocks.workflowsManagement.getWorkflowsByIds.mockResolvedValue([buildWorkflow('w-1', 'WF 1')]);

    const request = httpServerMock.createKibanaRequest();
    const route = buildRoute(request as unknown as KibanaRequest, mocks, { events, total: 1 });

    await route.handle();

    const okCall = (mocks.deps.response.ok as jest.Mock).mock.calls[0][0];
    expect(okCall.body.items[0]).toMatchObject({
      policy: { name: 'Policy 1' },
      rule: { name: 'Rule 1' },
      workflows: [{ name: 'WF 1' }],
    });
  });

  it('returns the page/perPage/totalEvents from the service in the response', async () => {
    const mocks = createMocks();
    const request = httpServerMock.createKibanaRequest();
    const route = buildRoute(request as unknown as KibanaRequest, mocks, {
      events: [],
      page: 4,
      perPage: 25,
      total: 137,
    });

    await route.handle();

    const okCall = (mocks.deps.response.ok as jest.Mock).mock.calls[0][0];
    expect(okCall.body).toMatchObject({ page: 4, perPage: 25, totalEvents: 137, items: [] });
  });

  it('passes empty arrays to bulk getters when no events are returned', async () => {
    const mocks = createMocks();
    const request = httpServerMock.createKibanaRequest();
    const route = buildRoute(request as unknown as KibanaRequest, mocks, { events: [], total: 0 });

    await route.handle();

    expect(mocks.actionPolicyClient.getActionPolicies).toHaveBeenCalledWith({ ids: [] });
    expect(mocks.rulesClient.getRules).toHaveBeenCalledWith([]);
    expect(mocks.workflowsManagement.getWorkflowsByIds).toHaveBeenCalledWith([], 'default');
  });

  it('lets errors propagate so BaseAlertingRoute.onError handles the response', async () => {
    const mocks = createMocks();
    const request = httpServerMock.createKibanaRequest();
    const route = buildRoute(request as unknown as KibanaRequest, mocks);
    mocks.eventLogService.findActionPolicyExecutionEvents.mockRejectedValueOnce(new Error('boom'));

    await route.handle();

    expect(mocks.deps.response.customError).toHaveBeenCalledTimes(1);
    expect(mocks.deps.response.ok).not.toHaveBeenCalled();
  });
});
