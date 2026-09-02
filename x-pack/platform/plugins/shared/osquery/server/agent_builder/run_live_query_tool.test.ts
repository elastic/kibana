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
import { registerFeatures } from '../utils/register_features';
import { PLUGIN_ID } from '../../common';

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

  // `writeLiveQueries` is grantable ONLY via the `live_queries_all` sub-feature
  // privilege, which co-grants `readLiveQueries` (see `register_features.ts`:
  // api: [osquery-writeLiveQueries, osquery-readLiveQueries]). The group is
  // `mutually_exclusive`, so a role resolves to All or Read and never to
  // write-without-read. `run_live_query` therefore returns rows inline under
  // `writeLiveQueries` alone without widening past the GET results route.
  //
  // This test pins that co-grant. If a future privilege change lets
  // `writeLiveQueries` be held without `readLiveQueries`, dispatching would
  // become a second path to rows the GET route denies, and this assertion
  // fails to force that decision back into review.
  it('grants readLiveQueries alongside writeLiveQueries in the feature registration', () => {
    const registerKibanaFeature = jest.fn();
    registerFeatures({ registerKibanaFeature } as never);

    expect(registerKibanaFeature).toHaveBeenCalledTimes(1);
    const feature = registerKibanaFeature.mock.calls[0][0];

    const privilegesGrantingWrite = feature.subFeatures
      .flatMap((subFeature: { privilegeGroups: unknown[] }) => subFeature.privilegeGroups)
      .flatMap((group: { groupType: string; privileges: Array<{ api?: string[] }> }) =>
        group.privileges.map((privilege) => ({ groupType: group.groupType, privilege }))
      )
      .filter(({ privilege }: { privilege: { api?: string[] } }) =>
        privilege.api?.includes(`${PLUGIN_ID}-writeLiveQueries`)
      );

    // Exactly one privilege grants write, and it co-grants read.
    expect(privilegesGrantingWrite).toHaveLength(1);
    expect(privilegesGrantingWrite[0].privilege.api).toContain(`${PLUGIN_ID}-readLiveQueries`);
    // Mutually-exclusive: a role resolves to All or Read, never write-without-read.
    expect(privilegesGrantingWrite[0].groupType).toBe('mutually_exclusive');
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
