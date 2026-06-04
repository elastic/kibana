/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, toArray, lastValueFrom } from 'rxjs';
import { ToolOrigin, ToolType } from '@kbn/agent-builder-common';
import { convertGraphEvents } from './convert_graph_events';
import { steps } from './constants';

jest.mock('@kbn/agent-builder-genai-utils/langchain', () => ({
  createBrowserToolCallEvent: jest.fn(),
  createMessageEvent: jest.fn(),
  createPromptRequestEvent: jest.fn(),
  createReasoningEvent: jest.fn((reasoning: string) => ({
    type: 'reasoning',
    data: { reasoning },
  })),
  createTextChunkEvent: jest.fn(),
  createThinkingCompleteEvent: jest.fn(),
  createToolCallEvent: jest.fn((data: any) => ({
    type: 'tool_call',
    data: {
      tool_call_id: data.toolCallId,
      tool_id: data.toolId,
      params: data.params,
      tool_call_group_id: data.toolCallGroupId,
      tool_origin: data.toolOrigin,
      tool_type: data.toolType,
    },
  })),
  createToolResultEvent: jest.fn(),
  extractTextContent: jest.fn(),
  hasTag: jest.fn(),
  matchEvent: jest.fn((event: any, expected: string) => event.event === expected),
  matchGraphName: jest.fn(
    (event: any, graphName: string) => event.metadata?.graphName === graphName
  ),
  matchName: jest.fn((event: any, expected: string) => event.name === expected),
  toolIdentifierFromToolCall: jest.fn(() => 'inline.dynamic'),
}));

jest.mock('./actions', () => ({
  isBackgroundExecutionCompleteAction: jest.fn(() => false),
  isExecuteToolAction: jest.fn(() => false),
  isToolPromptAction: jest.fn(() => false),
  isToolCallAction: jest.fn(
    (action: any) => action.kind === 'tool_call_action' || action.type === 'tool_call'
  ),
  isHandoverAction: jest.fn((action: any) => action?.type === 'hand_over'),
}));

describe('convertGraphEvents', () => {
  it('adds tool origin metadata to emitted tool-call events', async () => {
    const streamEvent = {
      event: 'on_chain_end',
      name: steps.researchAgent,
      metadata: {
        graphName: 'test-graph',
      },
      data: {
        output: {
          mainActions: [
            {
              kind: 'tool_call_action',
              message: 'reasoning text',
              tool_calls: [
                {
                  toolCallId: 'call-1',
                  args: { foo: 'bar' },
                },
              ],
            },
          ],
        },
      },
    } as any;

    const converted$ = of(streamEvent).pipe(
      convertGraphEvents({
        graphName: 'test-graph',
        toolManager: {
          getToolIdMapping: jest.fn().mockReturnValue(new Map()),
          getToolOrigin: jest.fn().mockReturnValue(ToolOrigin.inline),
          getToolType: jest.fn().mockReturnValue(ToolType.builtin),
        } as any,
        pendingRound: undefined,
        logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
        startTime: new Date(),
        structuredOutput: false,
      }),
      toArray()
    );

    const events = await lastValueFrom(converted$);

    // Reasoning is emitted before the tool call because convertGraphEvents
    // processes the action message text first, then iterates over tool_calls.
    expect(events).toEqual([
      expect.objectContaining({
        type: 'reasoning',
      }),
      expect.objectContaining({
        type: 'tool_call',
        data: expect.objectContaining({
          tool_call_id: 'call-1',
          tool_id: 'inline.dynamic',
          tool_origin: ToolOrigin.inline,
          tool_type: ToolType.builtin,
        }),
      }),
    ]);
  });

  it('emits messageEvent at on_chain_end of finalize using state.finalAnswer (string)', async () => {
    const { createMessageEvent } = jest.requireMock('@kbn/agent-builder-genai-utils/langchain');
    createMessageEvent.mockImplementation((content: string | object, opts: any) => ({
      type: 'message_complete',
      data: {
        message_id: opts?.messageId ?? 'unknown',
        message_content: typeof content === 'string' ? content : JSON.stringify(content),
        ...(typeof content === 'object' ? { structured_output: content } : {}),
      },
    }));

    const streamEvent = {
      event: 'on_chain_end',
      name: steps.finalize,
      metadata: { graphName: 'test-graph' },
      data: {
        output: {
          finalAnswer: 'final answer text',
        },
      },
    } as any;

    const events = await lastValueFrom(
      of(streamEvent).pipe(
        convertGraphEvents({
          graphName: 'test-graph',
          toolManager: {
            getToolIdMapping: jest.fn().mockReturnValue(new Map()),
            getToolOrigin: jest.fn(),
            getToolType: jest.fn(),
          } as any,
          pendingRound: undefined,
          logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
          startTime: new Date(),
          structuredOutput: false,
        }),
        toArray()
      )
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'message_complete',
        data: expect.objectContaining({
          message_content: 'final answer text',
        }),
      })
    );
  });

  it('emits messageEvent at on_chain_end of finalize using state.finalAnswer (object) for structured output', async () => {
    const { createMessageEvent } = jest.requireMock('@kbn/agent-builder-genai-utils/langchain');
    createMessageEvent.mockImplementation((content: string | object, opts: any) => ({
      type: 'message_complete',
      data: {
        message_id: opts?.messageId ?? 'unknown',
        message_content: typeof content === 'string' ? content : JSON.stringify(content),
        ...(typeof content === 'object' ? { structured_output: content } : {}),
      },
    }));

    const structuredAnswer = { foo: 'bar' };
    const streamEvent = {
      event: 'on_chain_end',
      name: steps.finalize,
      metadata: { graphName: 'test-graph' },
      data: {
        output: {
          finalAnswer: structuredAnswer,
        },
      },
    } as any;

    const events = await lastValueFrom(
      of(streamEvent).pipe(
        convertGraphEvents({
          graphName: 'test-graph',
          toolManager: {
            getToolIdMapping: jest.fn().mockReturnValue(new Map()),
            getToolOrigin: jest.fn(),
            getToolType: jest.fn(),
          } as any,
          pendingRound: undefined,
          logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
          startTime: new Date(),
          structuredOutput: true,
        }),
        toArray()
      )
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'message_complete',
        data: expect.objectContaining({
          structured_output: structuredAnswer,
        }),
      })
    );
  });

  it('emits thinkingCompleteEvent backdated to first chunk of terminal research turn', async () => {
    const { createThinkingCompleteEvent, hasTag, extractTextContent } = jest.requireMock(
      '@kbn/agent-builder-genai-utils/langchain'
    );
    hasTag.mockImplementation((event: any, tag: string) => event.tags?.includes(tag));
    extractTextContent.mockImplementation((chunk: any) => chunk?.content ?? '');
    createThinkingCompleteEvent.mockImplementation((time: number) => ({
      type: 'thinking_complete',
      data: { time_to_first_token: time },
    }));

    const startTime = new Date(1000);
    const events: any[] = [
      {
        event: 'on_chain_start',
        name: steps.researchAgent,
        metadata: { graphName: 'test-graph' },
      },
      {
        event: 'on_chat_model_stream',
        name: 'unused',
        tags: ['agent', 'research-agent'],
        metadata: { graphName: 'test-graph' },
        data: { chunk: { content: 'hello' } },
      },
      {
        event: 'on_chain_end',
        name: steps.researchAgent,
        metadata: { graphName: 'test-graph' },
        data: {
          output: {
            mainActions: [{ type: 'hand_over', message: 'final answer' }],
          },
        },
      },
    ];

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2500);

    try {
      const converted = await lastValueFrom(
        of(...events).pipe(
          convertGraphEvents({
            graphName: 'test-graph',
            toolManager: {
              getToolIdMapping: jest.fn().mockReturnValue(new Map()),
              getToolOrigin: jest.fn(),
              getToolType: jest.fn(),
            } as any,
            pendingRound: undefined,
            logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
            startTime,
            structuredOutput: false,
          }),
          toArray()
        )
      );

      expect(converted).toContainEqual(
        expect.objectContaining({
          type: 'thinking_complete',
          data: expect.objectContaining({ time_to_first_token: 1500 }),
        })
      );
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('does not emit thinkingCompleteEvent when research turn ends in tool calls', async () => {
    const { hasTag, extractTextContent } = jest.requireMock(
      '@kbn/agent-builder-genai-utils/langchain'
    );
    hasTag.mockImplementation((event: any, tag: string) => event.tags?.includes(tag));
    extractTextContent.mockImplementation((chunk: any) => chunk?.content ?? '');

    const events: any[] = [
      {
        event: 'on_chain_start',
        name: steps.researchAgent,
        metadata: { graphName: 'test-graph' },
      },
      {
        event: 'on_chat_model_stream',
        name: 'unused',
        tags: ['agent', 'research-agent'],
        metadata: { graphName: 'test-graph' },
        data: { chunk: { content: 'searching...' } },
      },
      {
        event: 'on_chain_end',
        name: steps.researchAgent,
        metadata: { graphName: 'test-graph' },
        data: {
          output: {
            mainActions: [
              {
                type: 'tool_call',
                tool_calls: [{ toolCallId: 'c1', args: {} }],
              },
            ],
          },
        },
      },
    ];

    const converted = await lastValueFrom(
      of(...events).pipe(
        convertGraphEvents({
          graphName: 'test-graph',
          toolManager: {
            getToolIdMapping: jest.fn().mockReturnValue(new Map()),
            getToolOrigin: jest.fn(),
            getToolType: jest.fn(),
          } as any,
          pendingRound: undefined,
          logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
          startTime: new Date(),
          structuredOutput: false,
        }),
        toArray()
      )
    );

    expect(converted).not.toContainEqual(expect.objectContaining({ type: 'thinking_complete' }));
  });

  it('does not emit thinkingCompleteEvent in structured mode', async () => {
    const { hasTag, extractTextContent } = jest.requireMock(
      '@kbn/agent-builder-genai-utils/langchain'
    );
    hasTag.mockImplementation((event: any, tag: string) => event.tags?.includes(tag));
    extractTextContent.mockImplementation((chunk: any) => chunk?.content ?? '');

    const events: any[] = [
      {
        event: 'on_chain_start',
        name: steps.researchAgent,
        metadata: { graphName: 'test-graph' },
      },
      {
        event: 'on_chat_model_stream',
        name: 'unused',
        tags: ['agent', 'research-agent'],
        metadata: { graphName: 'test-graph' },
        data: { chunk: { content: 'hello' } },
      },
      {
        event: 'on_chain_end',
        name: steps.researchAgent,
        metadata: { graphName: 'test-graph' },
        data: {
          output: {
            mainActions: [{ type: 'hand_over', message: 'draft' }],
          },
        },
      },
    ];

    const converted = await lastValueFrom(
      of(...events).pipe(
        convertGraphEvents({
          graphName: 'test-graph',
          toolManager: {
            getToolIdMapping: jest.fn().mockReturnValue(new Map()),
            getToolOrigin: jest.fn(),
            getToolType: jest.fn(),
          } as any,
          pendingRound: undefined,
          logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
          startTime: new Date(),
          structuredOutput: true,
        }),
        toArray()
      )
    );

    expect(converted).not.toContainEqual(expect.objectContaining({ type: 'thinking_complete' }));
  });
});
