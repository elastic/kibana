/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolMessage } from '@langchain/core/messages';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { FormPromptRequest } from '@kbn/agent-builder-common/agents';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { RunToolReturn } from '@kbn/agent-builder-server';
import { AgentActionType } from './actions';
import { processToolNodeResponse } from './action_utils';

const makeToolMessage = ({
  toolCallId,
  artifact,
  content = '{"results":[]}',
}: {
  toolCallId: string;
  artifact: RunToolReturn;
  content?: string;
}): ToolMessage =>
  new ToolMessage({
    content,
    tool_call_id: toolCallId,
    artifact,
  });

const makeFormPrompt = (): FormPromptRequest => ({
  type: AgentPromptType.form,
  execution_id: 'exec-123',
  id: 'prompt-456',
  message: 'Please fill in the form',
  schema: { type: 'object', properties: {} },
  step_execution_id: 'step-789',
});

const makeToolResult = () => ({
  type: ToolResultType.other as const,
  tool_result_id: 'result-001',
  data: { execution: { status: 'waiting_for_input' } },
});

describe('processToolNodeResponse', () => {
  describe('when a tool returns only results (standard return)', () => {
    it('returns a single ExecuteToolAction', () => {
      const toolCallId = 'call-standard-1';
      const artifact: RunToolReturn = {
        results: [makeToolResult()],
      };
      const toolMessage = makeToolMessage({ toolCallId, artifact });

      const actions = processToolNodeResponse([toolMessage], { cycle: 1 });

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe(AgentActionType.ExecuteTool);
    });

    it('does not return a ToolPromptAction', () => {
      const toolCallId = 'call-standard-2';
      const artifact: RunToolReturn = { results: [makeToolResult()] };
      const toolMessage = makeToolMessage({ toolCallId, artifact });

      const actions = processToolNodeResponse([toolMessage], { cycle: 1 });

      const hasPromptAction = actions.some((a) => a.type === AgentActionType.ToolPrompt);
      expect(hasPromptAction).toBe(false);
    });
  });

  describe('when a tool returns results AND a form prompt (ToolHandlerResultsWithPromptReturn)', () => {
    it('returns both an ExecuteToolAction and a ToolPromptAction', () => {
      const toolCallId = 'call-hitl-1';
      const formPrompt = makeFormPrompt();
      const artifact: RunToolReturn = {
        results: [makeToolResult()],
        prompt: formPrompt,
      };
      const toolMessage = makeToolMessage({ toolCallId, artifact });

      const actions = processToolNodeResponse([toolMessage], { cycle: 1 });

      expect(actions).toHaveLength(2);
      expect(actions[0].type).toBe(AgentActionType.ExecuteTool);
      expect(actions[1].type).toBe(AgentActionType.ToolPrompt);
    });

    it('includes the tool results in the ExecuteToolAction', () => {
      const toolCallId = 'call-hitl-2';
      const formPrompt = makeFormPrompt();
      const toolResult = makeToolResult();
      const artifact: RunToolReturn = {
        results: [toolResult],
        prompt: formPrompt,
      };
      const toolMessage = makeToolMessage({ toolCallId, artifact });

      const actions = processToolNodeResponse([toolMessage], { cycle: 1 });

      const executeAction = actions.find((a) => a.type === AgentActionType.ExecuteTool);
      expect(executeAction).toBeDefined();
    });

    it('includes the form prompt in the ToolPromptAction', () => {
      const toolCallId = 'call-hitl-3';
      const formPrompt = makeFormPrompt();
      const artifact: RunToolReturn = {
        results: [makeToolResult()],
        prompt: formPrompt,
      };
      const toolMessage = makeToolMessage({ toolCallId, artifact });

      const actions = processToolNodeResponse([toolMessage], { cycle: 1 });

      const promptAction = actions.find((a) => a.type === AgentActionType.ToolPrompt);
      expect(promptAction).toBeDefined();
      if (promptAction?.type === AgentActionType.ToolPrompt) {
        expect(promptAction.prompts).toHaveLength(1);
        expect(promptAction.prompts[0].prompt).toEqual(formPrompt);
        expect(promptAction.prompts[0].tool_call_id).toBe(toolCallId);
      }
    });
  });
});
