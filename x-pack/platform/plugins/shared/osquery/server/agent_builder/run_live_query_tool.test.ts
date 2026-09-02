/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { isToolHandlerStandardReturn, type ToolHandlerReturn } from '@kbn/agent-builder-server';
import type { ToolResult } from '@kbn/agent-builder-common';
import type { SchemaService } from '../lib/schema_service';
import { runLiveQueryTool } from './run_live_query_tool';

jest.mock('../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn().mockResolvedValue({}),
}));

jest.mock('../handlers', () => ({
  createActionHandler: jest.fn().mockResolvedValue({
    response: {
      action_id: 'parent-action-1',
      queries: [{ action_id: 'query-action-1' }],
      agents: ['agent-1'],
    },
    fleetActionsCount: 1,
  }),
}));

jest.mock('../lib/get_user_info', () => ({
  getUserInfo: jest.fn().mockResolvedValue({ username: 'analyst', profile_uid: 'uid-1' }),
}));

jest.mock('./poll_action_responses', () => ({
  pollActionResponses: jest.fn().mockResolvedValue({
    rows: [{ pid: 1 }],
    responded: 1,
    status: 'completed',
    error: undefined,
  }),
}));

import { pollActionResponses } from './poll_action_responses';

const schemaService = () =>
  ({
    getSchema: jest.fn().mockResolvedValue({
      data: [{ name: 'processes', description: '', platforms: ['darwin'], columns: [] }],
      version: '5.19.0',
    }),
  } as unknown as SchemaService);

const buildContext = (grantedPrivileges: string[]) => {
  const checkPrivileges = jest
    .fn()
    .mockImplementation(async ({ kibana }: { kibana: string[] }) => ({
      privileges: {
        kibana: kibana.map((privilege) => ({
          privilege,
          authorized: grantedPrivileges.some((granted) => `api:${granted}` === privilege),
        })),
      },
    }));

  const security = {
    authz: {
      mode: { useRbacForRequest: () => true },
      actions: { api: { get: (privilege: string) => `api:${privilege}` } },
      checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
    },
  };

  const savedObjectsClient = {
    find: jest.fn().mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 20 }),
  };

  const context = {
    experimentalFeatures: { agentBuilderTools: true },
    logFactory: { get: () => loggerMock.create() },
    getStartServices: jest.fn().mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asInternalUser: {
              search: jest.fn().mockResolvedValue({ hits: { total: { value: 0 }, hits: [] } }),
            },
          },
        },
        savedObjects: { getScopedClient: jest.fn().mockReturnValue(savedObjectsClient) },
      },
      { security },
    ]),
    service: {
      getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
      getPackageService: jest.fn().mockReturnValue({}),
    },
  } as any;

  return { context };
};

interface RunLiveQueryResultData {
  action_id?: string;
  status?: string;
  rows?: unknown[];
  row_count?: number;
  guidance?: string;
  message?: string;
}

const getResultData = (result: ToolHandlerReturn<ToolResult>): RunLiveQueryResultData => {
  if (!isToolHandlerStandardReturn(result)) {
    throw new Error('Expected standard handler return');
  }

  return result.results[0].data as unknown as RunLiveQueryResultData;
};

describe('runLiveQueryTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pollActionResponses as jest.Mock).mockResolvedValue({
      rows: [{ pid: 1 }],
      responded: 1,
      status: 'completed',
      error: undefined,
    });
  });

  it('returns rows inline when the caller holds both writeLiveQueries and readLiveQueries', async () => {
    const { context } = buildContext(['osquery-writeLiveQueries', 'osquery-readLiveQueries']);
    const tool = runLiveQueryTool(context, loggerMock.create(), schemaService());

    const result = await tool.handler(
      { query: 'SELECT pid FROM processes', agent_ids: ['agent-1'] },
      { request: {}, spaceId: 'default' } as any
    );

    const data = getResultData(result);
    expect(data.status).toBe('completed');
    expect(data.rows).toEqual([{ pid: 1 }]);
    expect(pollActionResponses).toHaveBeenCalled();
  });

  // Regression: writeLiveQueries and readLiveQueries are independently
  // grantable (mutually-exclusive sub-feature privilege group). Dispatching
  // must not become a second path to result rows that the GET results route
  // (guarded by readLiveQueries alone) would deny this caller.
  it('dispatches but withholds inline rows when the caller lacks readLiveQueries', async () => {
    const { context } = buildContext(['osquery-writeLiveQueries']);
    const tool = runLiveQueryTool(context, loggerMock.create(), schemaService());

    const result = await tool.handler(
      { query: 'SELECT pid FROM processes', agent_ids: ['agent-1'] },
      { request: {}, spaceId: 'default' } as any
    );

    const data = getResultData(result);
    expect(data.action_id).toBe('query-action-1');
    expect(data.status).toBe('dispatched');
    expect(data.rows).toBeUndefined();
    expect(data.row_count).toBeUndefined();
    expect(data.guidance).toMatch(/readLiveQueries/);
    // No point polling for rows this caller can never see inline.
    expect(pollActionResponses).not.toHaveBeenCalled();
  });

  it('still denies the whole call when the caller lacks writeLiveQueries', async () => {
    const { context } = buildContext(['osquery-readLiveQueries']);
    const tool = runLiveQueryTool(context, loggerMock.create(), schemaService());

    const result = await tool.handler(
      { query: 'SELECT pid FROM processes', agent_ids: ['agent-1'] },
      { request: {}, spaceId: 'default' } as any
    );

    const data = getResultData(result);
    expect(data.message).toMatch(/Insufficient Osquery privileges/);
    expect(pollActionResponses).not.toHaveBeenCalled();
  });
});
