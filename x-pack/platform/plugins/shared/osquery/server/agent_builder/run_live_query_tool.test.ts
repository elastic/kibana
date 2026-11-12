/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { isToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { SchemaService } from '../lib/schema_service';
import { createActionHandler } from '../handlers';
import { getUserInfo } from '../lib/get_user_info';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import { runLiveQueryTool } from './run_live_query_tool';
import { pollActionResponses } from './poll_action_responses';
import { buildToolContext, toolRequest } from './test_helpers';

jest.mock('../handlers');
jest.mock('../lib/get_user_info');
jest.mock('../utils/get_internal_saved_object_client');
jest.mock('./poll_action_responses');

const createActionMock = createActionHandler as jest.MockedFunction<typeof createActionHandler>;
const pollMock = pollActionResponses as jest.MockedFunction<typeof pollActionResponses>;

const schemaService = {
  getSchema: jest.fn().mockResolvedValue({
    data: [{ name: 'processes', description: '', platforms: ['darwin'], columns: [] }],
    version: '5.19.0',
  }),
} as unknown as SchemaService;

const invoke = async () => {
  const { context } = buildToolContext({
    grantedPrivileges: ['writeLiveQueries'],
    spaceId: 'space-a',
  });
  const result = await runLiveQueryTool(context, loggerMock.create(), schemaService).handler(
    { query: 'SELECT pid FROM processes', agent_ids: ['agent-1'] },
    { request: toolRequest, spaceId: 'space-a' } as never
  );
  if (!isToolHandlerStandardReturn(result)) {
    throw new Error('Expected standard handler return');
  }

  return result.results[0] as { type: string; data: Record<string, unknown> };
};

describe('runLiveQueryTool handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'analyst' });
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue({});
    (schemaService.getSchema as jest.Mock).mockResolvedValue({
      data: [{ name: 'processes', description: '', platforms: ['darwin'], columns: [] }],
      version: '5.19.0',
    });
  });

  it('polls and returns the child query action id, not the parent', async () => {
    createActionMock.mockResolvedValue({
      response: {
        action_id: 'parent-action',
        queries: [{ action_id: 'child-action' }],
        agents: ['agent-1'],
      },
      fleetActionsCount: 1,
    } as never);
    pollMock.mockResolvedValue({
      responded: 1,
      expected: 1,
      rows: [{ pid: '1' }],
      totalRows: 1,
      truncated: false,
      status: 'completed',
    });

    const result = await invoke();

    expect(pollMock).toHaveBeenCalledWith(
      expect.anything(),
      'child-action',
      expect.objectContaining({ spaceId: 'space-a', expectedAgentCount: 1 })
    );
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data).toMatchObject({
      action_id: 'child-action',
      parent_action_id: 'parent-action',
      status: 'completed',
      row_count: 1,
      total_rows: 1,
      truncated: false,
    });
  });

  it('returns an error and does not poll when Fleet returns no child action id', async () => {
    createActionMock.mockResolvedValue({
      response: { action_id: 'parent-action', queries: [], agents: ['agent-1'] },
      fleetActionsCount: 1,
    } as never);

    const result = await invoke();

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data).toMatchObject({ parent_action_id: 'parent-action' });
    expect(pollMock).not.toHaveBeenCalled();
  });

  it('returns an error result when dispatch throws', async () => {
    createActionMock.mockRejectedValue(new Error('fleet down'));

    const result = await invoke();

    expect(result.type).toBe(ToolResultType.error);
    expect(String(result.data.message)).toContain('fleet down');
    expect(pollMock).not.toHaveBeenCalled();
  });
});
