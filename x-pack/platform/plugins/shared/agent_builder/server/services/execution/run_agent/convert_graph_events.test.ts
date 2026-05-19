/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, toArray, lastValueFrom } from 'rxjs';
import { ToolOrigin } from '@kbn/agent-builder-common';
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
  isAnswerAction: jest.fn(() => false),
  isExecuteToolAction: jest.fn(() => false),
  isStructuredAnswerAction: jest.fn(() => false),
  isToolPromptAction: jest.fn(() => false),
  isToolCallAction: jest.fn((action: any) => action.kind === 'tool_call_action'),
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
        } as any,
        pendingRound: undefined,
        logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
        startTime: new Date(),
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
        }),
      }),
    ]);
  });
});
