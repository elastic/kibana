/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, toArray, lastValueFrom } from 'rxjs';
import type { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type { Logger } from '@kbn/logging';
import {
  ChatEventType,
  ConversationRoundStepType,
  ToolOrigin,
  ToolResultType,
  ToolType,
} from '@kbn/agent-builder-common';
import { AgentPromptRequestSourceType, AgentPromptType } from '@kbn/agent-builder-common/agents';
import { internalTools } from '@kbn/agent-builder-common/tools';
import { convertGraphEvents, type ConvertedEvents } from './convert_graph_events';
import { steps } from './constants';
import { stepUpdates } from './step_state';
import type { ToolRenderStateUpdate } from './transient_state';

const GRAPH = 'test-graph';

const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger;

const chainEnd = (
  name: string,
  output: unknown,
  metadata: Record<string, unknown> = {}
): LangchainStreamEvent =>
  ({
    event: 'on_chain_end',
    name,
    run_id: 'run',
    tags: [],
    metadata: {
      graphName: GRAPH,
      langgraph_node: name,
      langgraph_checkpoint_ns: `${name}:abc`,
      ...metadata,
    },
    data: { output },
  } as LangchainStreamEvent);

const collect = (
  events: LangchainStreamEvent[],
  {
    structuredOutput = false,
    startTime = new Date(),
  }: { structuredOutput?: boolean; startTime?: Date } = {}
): Promise<ConvertedEvents[]> =>
  lastValueFrom(
    of(...events).pipe(
      convertGraphEvents({ graphName: GRAPH, logger, startTime, structuredOutput }),
      toArray()
    )
  );

describe('convertGraphEvents', () => {
  it('emits reasoning and tool_call events from researchAgent step updates in order', async () => {
    const renderState: ToolRenderStateUpdate = {
      c1: { toolName: 'my_tool', kind: 'server', cycle: 1 },
      b1: { toolName: 'browser_open', kind: 'browser', cycle: 1 },
      a1: { toolName: 'platform_core_ask_user_question', kind: 'dedicated', cycle: 1 },
    };
    const output = {
      steps: [
        stepUpdates.append({
          type: ConversationRoundStepType.reasoning,
          reasoning: 'group',
          tool_call_group_id: 'g',
        }),
        stepUpdates.append({
          type: ConversationRoundStepType.reasoning,
          reasoning: 'why',
          tool_call_id: 'c1',
          tool_call_group_id: 'g',
        }),
        stepUpdates.appendToolCall({
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'c1',
          tool_id: 'my.tool',
          params: { q: 1 },
          results: [],
          progression: [],
          tool_call_group_id: 'g',
          tool_origin: ToolOrigin.builtin,
          tool_type: ToolType.builtin,
        }),
        stepUpdates.appendToolCall({
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'b1',
          tool_id: 'open',
          params: {},
          results: [],
          progression: [],
          tool_call_group_id: 'g',
        }),
        // dedicated-lifecycle call (ask_user_question): runtime step, no tool_call event
        stepUpdates.appendToolCall({
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'a1',
          tool_id: internalTools.askUserQuestion,
          params: {},
          results: [],
          progression: [],
          tool_call_group_id: 'g',
        }),
      ],
      researchOutcome: { type: 'tool_calls', toolCalls: [], toolCallGroupId: 'g' },
      toolRenderState: renderState,
    };

    const events = await collect([chainEnd(steps.researchAgent, output)]);

    expect(events.map((e) => e.type)).toEqual([
      ChatEventType.reasoning,
      ChatEventType.reasoning,
      ChatEventType.toolCall,
      ChatEventType.browserToolCall,
    ]);
    expect(events[0].data).toEqual({ reasoning: 'group', tool_call_group_id: 'g' });
    expect(events[1].data).toEqual({
      reasoning: 'why',
      tool_call_id: 'c1',
      tool_call_group_id: 'g',
    });
    expect(events[2].data).toEqual({
      tool_call_id: 'c1',
      tool_id: 'my.tool',
      params: { q: 1 },
      tool_call_group_id: 'g',
      tool_origin: ToolOrigin.builtin,
      tool_type: ToolType.builtin,
    });
    expect(events[3].data).toEqual({ tool_call_id: 'b1', tool_id: 'open', params: {} });
  });

  it('emits tool_result, prompt_request, user_question_asked and roster events from executeTool', async () => {
    const askPrompt = {
      id: 'p1',
      type: AgentPromptType.ask_user_question,
      questions: [{ question: '?', options: [{ label: 'y' }], multi_select: false }],
    };
    const results = [{ tool_result_id: 'r1', type: ToolResultType.other, data: { ok: true } }];
    const output = {
      steps: [
        stepUpdates.resolveToolCall({
          toolCallId: 'c1',
          toolId: 'my.tool',
          results,
          progression: [],
        }),
        stepUpdates.upsertQuestion({
          type: ConversationRoundStepType.askUserQuestion,
          prompt_id: 'p1',
          questions: askPrompt.questions,
        }),
        stepUpdates.append({
          type: ConversationRoundStepType.subagentRosterUpdated,
          roster: [{ name: 'sub', conversation_id: 'conv' }],
        }),
      ],
      toolOutcome: { type: 'interrupted', prompts: [{ toolCallId: 'a1', prompt: askPrompt }] },
    };

    const events = await collect([chainEnd(steps.executeTool, output)]);

    expect(events.map((e) => e.type)).toEqual([
      ChatEventType.toolResult,
      ChatEventType.promptRequest,
      ChatEventType.userQuestionAsked,
      ChatEventType.subagentRosterUpdated,
    ]);
    expect(events[0].data).toEqual({ tool_call_id: 'c1', tool_id: 'my.tool', results });
    expect(events[1].data).toMatchObject({
      prompt: askPrompt,
      source: { type: AgentPromptRequestSourceType.toolCall, tool_call_id: 'a1' },
    });
    expect(events[2].data).toMatchObject({ prompt_id: 'p1', questions: askPrompt.questions });
    expect(events[3].data).toEqual({ roster: [{ name: 'sub', conversation_id: 'conv' }] });
  });

  it('emits nothing from executeTool when the batch completed without updates of interest', async () => {
    const events = await collect([
      chainEnd(steps.executeTool, { steps: [], toolOutcome: { type: 'completed' } }),
    ]);
    expect(events).toEqual([]);
  });

  it('emits background_agent_complete from checkBackgroundWork appends', async () => {
    const execution = {
      execution_id: 'x1',
      status: 'completed' as const,
      response: { message: 'done' },
    };
    const events = await collect([
      chainEnd(steps.checkBackgroundWork, {
        steps: [
          stepUpdates.append({
            type: ConversationRoundStepType.backgroundAgentComplete,
            ...execution,
          }),
        ],
      }),
    ]);
    expect(events).toEqual([{ type: ChatEventType.backgroundAgentComplete, data: { execution } }]);
  });

  it('ignores node on_chain_end events from a nested run of the graph', async () => {
    const output = {
      steps: [
        stepUpdates.append({
          type: ConversationRoundStepType.reasoning,
          reasoning: 'nested',
          tool_call_group_id: 'g',
        }),
      ],
      researchOutcome: { type: 'tool_calls', toolCalls: [], toolCallGroupId: 'g' },
      toolRenderState: {},
    };
    const events = await collect([
      chainEnd(steps.researchAgent, output, {
        langgraph_checkpoint_ns: 'executeTool:t1|researchAgent:t2',
      }),
      // a runnable inside the node, not the node itself
      chainEnd(steps.researchAgent, output, { langgraph_node: steps.executeTool }),
      // another graph
      chainEnd(steps.researchAgent, output, { graphName: 'other-graph' }),
    ]);
    expect(events).toEqual([]);
  });

  it('emits messageEvent at on_chain_end of finalize using state.finalAnswer (string)', async () => {
    const events = await collect([chainEnd(steps.finalize, { finalAnswer: 'final answer text' })]);

    expect(events).toEqual([
      expect.objectContaining({
        type: ChatEventType.messageComplete,
        data: expect.objectContaining({ message_content: 'final answer text' }),
      }),
    ]);
  });

  it('emits messageEvent at on_chain_end of finalize using state.finalAnswer (object) for structured output', async () => {
    const structuredAnswer = { foo: 'bar' };
    const events = await collect([chainEnd(steps.finalize, { finalAnswer: structuredAnswer })], {
      structuredOutput: true,
    });

    expect(events).toEqual([
      expect.objectContaining({
        type: ChatEventType.messageComplete,
        data: expect.objectContaining({ structured_output: structuredAnswer }),
      }),
    ]);
  });

  it('emits the final state event at the end of the root graph', async () => {
    const finalState = { finalAnswer: 'x', steps: [] };
    const events = await collect([
      { ...chainEnd(GRAPH, finalState), metadata: { graphName: GRAPH } } as LangchainStreamEvent,
    ]);
    expect(events).toEqual([expect.objectContaining({ data: { state: finalState } })]);
  });

  describe('thinking_complete', () => {
    const researchTurn = (
      output: unknown,
      { chunk }: { chunk?: string } = {}
    ): LangchainStreamEvent[] => [
      {
        event: 'on_chain_start',
        name: steps.researchAgent,
        run_id: 'run',
        tags: [],
        metadata: { graphName: GRAPH },
        data: {},
      } as LangchainStreamEvent,
      ...(chunk !== undefined
        ? [
            {
              event: 'on_chat_model_stream',
              name: 'unused',
              run_id: 'run',
              tags: ['agent', 'research-agent'],
              metadata: { graphName: GRAPH },
              data: { chunk: { content: chunk } },
            } as unknown as LangchainStreamEvent,
          ]
        : []),
      chainEnd(steps.researchAgent, output),
    ];

    it('is backdated to the first chunk of the terminal research turn', async () => {
      const startTime = new Date(1000);
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2500);
      try {
        const events = await collect(
          researchTurn(
            {
              steps: [],
              researchOutcome: { type: 'handover', message: 'final answer', forceful: false },
            },
            { chunk: 'hello' }
          ),
          { startTime }
        );
        expect(events).toContainEqual({
          type: ChatEventType.thinkingComplete,
          data: { time_to_first_token: 1500 },
        });
      } finally {
        nowSpy.mockRestore();
      }
    });

    it('is not emitted when the research turn ends in tool calls', async () => {
      const events = await collect(
        researchTurn(
          {
            steps: [],
            researchOutcome: { type: 'tool_calls', toolCalls: [], toolCallGroupId: 'g' },
          },
          { chunk: 'searching...' }
        )
      );
      expect(events).not.toContainEqual(
        expect.objectContaining({ type: ChatEventType.thinkingComplete })
      );
    });

    it('is not emitted in structured mode', async () => {
      const events = await collect(
        researchTurn(
          {
            steps: [],
            researchOutcome: { type: 'handover', message: 'draft', forceful: false },
          },
          { chunk: 'hello' }
        ),
        { structuredOutput: true }
      );
      expect(events).not.toContainEqual(
        expect.objectContaining({ type: ChatEventType.thinkingComplete })
      );
    });
  });
});
