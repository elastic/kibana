/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStatus, ToolResultType } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { isExecuteToolAction, isToolCallAction } from '../actions';
import { pendingBrowserToolResultPromptsToActions } from './pending_browser_tool_result_prompts_to_actions';

describe('pendingBrowserToolResultPromptsToActions', () => {
  const baseRound = {
    id: 'r1',
    status: ConversationRoundStatus.awaitingPrompt,
    input: { message: '' },
    started_at: '2026-06-04T00:00:00.000Z',
    time_to_first_token: 0,
    time_to_last_token: 0,
    response: { message: '' },
    steps: [],
    pending_prompts: [
      {
        type: AgentPromptType.browser_tool_result,
        id: 'p1',
        tool_id: 'set_time_range',
        tool_call_id: 'call-1',
        params: {},
      },
    ],
  } as any;

  it('materializes tool call and tool result actions on success', async () => {
    const result = await pendingBrowserToolResultPromptsToActions({
      round: baseRound,
      promptState: {
        responses: {
          p1: {
            type: AgentPromptType.browser_tool_result,
            response: {
              ok: true,
              results: [{ type: ToolResultType.other, data: { message: 'ok' } }],
            },
          },
        },
      },
    });

    expect(result.consumedPromptIds).toEqual(['p1']);
    expect(result.actions).toHaveLength(2);
    expect(isToolCallAction(result.actions[0])).toBe(true);
    expect(isExecuteToolAction(result.actions[1])).toBe(true);
  });

  it('materializes an error tool result when ok is false', async () => {
    const result = await pendingBrowserToolResultPromptsToActions({
      round: baseRound,
      promptState: {
        responses: {
          p1: {
            type: AgentPromptType.browser_tool_result,
            response: { ok: false, error: 'capture failed' },
          },
        },
      },
    });

    expect(result.actions).toHaveLength(2);
    expect(isExecuteToolAction(result.actions[1])).toBe(true);
    if (isExecuteToolAction(result.actions[1])) {
      expect(result.actions[1].tool_results[0].content).toContain('capture failed');
    }
  });
});
