/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { isToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getLiveQueryResultsTool } from './get_live_query_results_tool';
import { assertActionBelongsToSpace } from './assert_action_in_space';
import { pollActionResponses } from './poll_action_responses';
import { buildToolContext, toolRequest } from './test_helpers';

jest.mock('./assert_action_in_space');
jest.mock('./poll_action_responses');

const assertMock = assertActionBelongsToSpace as jest.MockedFunction<
  typeof assertActionBelongsToSpace
>;
const pollMock = pollActionResponses as jest.MockedFunction<typeof pollActionResponses>;

const invoke = async (input: { action_id: string; wait_seconds?: number; max_rows?: number }) => {
  const { context } = buildToolContext({
    grantedPrivileges: ['readLiveQueries'],
    spaceId: 'space-a',
  });
  const result = await getLiveQueryResultsTool(context, loggerMock.create()).handler(input, {
    request: toolRequest,
    spaceId: 'space-a',
  } as never);
  if (!isToolHandlerStandardReturn(result)) {
    throw new Error('Expected standard handler return');
  }

  return result.results[0] as { type: string; data: Record<string, unknown> };
};

describe('getLiveQueryResultsTool handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns an error and never polls when the action is not in the caller space', async () => {
    assertMock.mockResolvedValue({ found: false });

    const result = await invoke({ action_id: 'foreign-action' });

    expect(result.type).toBe(ToolResultType.error);
    expect(String(result.data.message)).toContain('foreign-action');
    expect(assertMock).toHaveBeenCalledWith(expect.anything(), 'foreign-action', 'space-a');
    expect(pollMock).not.toHaveBeenCalled();
  });

  it('polls with the caller space and expected agent count when the action is owned (negative control)', async () => {
    assertMock.mockResolvedValue({ found: true, expectedAgentCount: 2 });
    pollMock.mockResolvedValue({
      responded: 2,
      expected: 2,
      rows: [{ pid: '1' }],
      totalRows: 1,
      truncated: false,
      status: 'completed',
    });

    const result = await invoke({ action_id: 'child-action' });

    expect(result.type).toBe(ToolResultType.other);
    expect(pollMock).toHaveBeenCalledWith(
      expect.anything(),
      'child-action',
      expect.objectContaining({ spaceId: 'space-a', expectedAgentCount: 2 })
    );
    expect(result.data).toMatchObject({ status: 'completed', row_count: 1, total_rows: 1 });
  });

  it('reports total_rows and truncated when results exceed the returned page', async () => {
    assertMock.mockResolvedValue({ found: true, expectedAgentCount: 1 });
    pollMock.mockResolvedValue({
      responded: 1,
      expected: 1,
      rows: [{ pid: '1' }, { pid: '2' }],
      totalRows: 5000,
      truncated: true,
      status: 'completed',
    });

    const result = await invoke({ action_id: 'child-action', max_rows: 2 });

    expect(result.data).toMatchObject({ row_count: 2, total_rows: 5000, truncated: true });
  });
});
