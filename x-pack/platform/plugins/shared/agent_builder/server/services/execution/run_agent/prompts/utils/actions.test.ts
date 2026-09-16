/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAIMessage, isHumanMessage, isToolMessage } from '@langchain/core/messages';
import type {
  AIMessage,
  ToolMessage,
  BaseMessage,
  BaseMessageLike,
} from '@langchain/core/messages';
import { AgentActionType, contextLengthErrorAction, substitutionAction } from '../../actions';
import type {
  ResearchAgentAction,
  ToolCallAction,
  ExecuteToolAction,
  BackgroundExecutionCompleteAction,
} from '../../actions';
import { formatResearcherActionHistory, formatSystemNotice } from './actions';
import { ExecutionStatus, ToolResultType } from '@kbn/agent-builder-common';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import type { ToolResult } from '@kbn/agent-builder-common';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import type { BackgroundExecutionState } from '@kbn/agent-builder-common/chat';
import type { ToolCallResultTransformer } from '../../utils/tool_summarization';

const makeToolCallAction = (
  toolCalls: Array<{ toolCallId: string; toolName: string; args?: Record<string, any> }>,
  message?: string,
  cycle?: number
): ToolCallAction => ({
  type: AgentActionType.ToolCall,
  tool_call_group_id: 'tool_call_group_id',
  tool_calls: toolCalls.map((tc) => ({
    toolCallId: tc.toolCallId,
    toolName: tc.toolName,
    args: tc.args ?? {},
  })),
  message,
  cycle,
});

const makeExecuteToolAction = (
  results: Array<{ toolCallId: string; content: string; artifact?: { results: ToolResult[] } }>,
  cycle?: number
): ExecuteToolAction => ({
  type: AgentActionType.ExecuteTool,
  tool_results: results.map((r) => ({
    toolCallId: r.toolCallId,
    content: r.content,
    artifact: r.artifact,
  })),
  cycle,
});

const makeCompletedExecution = (
  overrides: Partial<BackgroundExecutionState> = {}
): BackgroundExecutionState => ({
  execution_id: 'exec-123',
  status: ExecutionStatus.completed,
  response: { message: 'The task is done.' },
  completed_at: { round_id: 'round-1' },
  ...overrides,
});

const makeFailedExecution = (
  overrides: Partial<BackgroundExecutionState> = {}
): BackgroundExecutionState => ({
  execution_id: 'exec-456',
  status: ExecutionStatus.failed,
  error: { code: 'internalError' as any, message: 'LLM timeout' },
  completed_at: { round_id: 'round-1' },
  ...overrides,
});

const makeBackgroundExecutionCompleteAction = (
  execution: BackgroundExecutionState
): BackgroundExecutionCompleteAction => ({
  type: AgentActionType.BackgroundExecutionComplete,
  execution,
});

describe('formatResearcherActionHistory', () => {
  it('creates AIMessage with empty content when no message is set', async () => {
    const actions: ResearchAgentAction[] = [
      makeToolCallAction([{ toolCallId: 'c1', toolName: 'search', args: { q: 'foo' } }]),
      makeExecuteToolAction([{ toolCallId: 'c1', content: 'result' }]),
    ];

    const messages = await formatResearcherActionHistory({ actions, cycleLimit: 100 });

    const aiMsg = messages[0];
    expect(isAIMessage(aiMsg as AIMessage)).toBe(true);
    expect((aiMsg as AIMessage).content).toBe('');
  });

  it('sets AIMessage content to the action message when provided', async () => {
    const actions: ResearchAgentAction[] = [
      makeToolCallAction(
        [{ toolCallId: 'c1', toolName: 'search', args: { q: 'foo' } }],
        'I need to search for foo'
      ),
      makeExecuteToolAction([{ toolCallId: 'c1', content: 'result' }]),
    ];

    const messages = await formatResearcherActionHistory({ actions, cycleLimit: 100 });

    const aiMsg = messages[0];
    expect(isAIMessage(aiMsg as AIMessage)).toBe(true);
    expect((aiMsg as AIMessage).content).toBe('I need to search for foo');
  });

  it('preserves tool call args in the AIMessage', async () => {
    const actions: ResearchAgentAction[] = [
      makeToolCallAction([
        { toolCallId: 'c1', toolName: 'search', args: { q: 'foo' } },
        { toolCallId: 'c2', toolName: 'lookup', args: { id: 42 } },
      ]),
      makeExecuteToolAction([
        { toolCallId: 'c1', content: 'result1' },
        { toolCallId: 'c2', content: 'result2' },
      ]),
    ];

    const messages = await formatResearcherActionHistory({ actions, cycleLimit: 100 });

    const aiMsg = messages[0] as AIMessage;
    expect(aiMsg.tool_calls).toHaveLength(2);
    expect(aiMsg.tool_calls![0].args).toEqual({ q: 'foo' });
    expect(aiMsg.tool_calls![1].args).toEqual({ id: 42 });
  });

  it('formats BackgroundExecutionCompleteAction as a user message with system notice', async () => {
    const actions: ResearchAgentAction[] = [
      makeToolCallAction([{ toolCallId: 'c1', toolName: 'search' }]),
      makeExecuteToolAction([{ toolCallId: 'c1', content: 'result' }]),
      makeBackgroundExecutionCompleteAction(makeCompletedExecution()),
    ];

    const messages = await formatResearcherActionHistory({ actions, cycleLimit: 100 });

    // Tool call (AI) + tool result + background notice (user message)
    const lastMessage = messages[messages.length - 1];
    expect(isHumanMessage(lastMessage as any)).toBe(true);
    expect((lastMessage as any).content).toContain('<system_notice>');
    expect((lastMessage as any).content).toContain('exec-123');
  });

  it('formats failed BackgroundExecutionCompleteAction as a user message', async () => {
    const actions: ResearchAgentAction[] = [
      makeBackgroundExecutionCompleteAction(makeFailedExecution()),
    ];

    const messages = await formatResearcherActionHistory({ actions, cycleLimit: 100 });

    expect(messages).toHaveLength(1);
    expect(isHumanMessage(messages[0] as any)).toBe(true);
    expect((messages[0] as any).content).toContain('has failed');
    expect((messages[0] as any).content).toContain('LLM timeout');
  });

  describe('result transformation', () => {
    const mockToolManager = {
      getToolIdMapping: () => new Map<string, string>([['search', 'platform.search']]),
    } as unknown as ToolManager;

    const rawResults = (n: number): ToolResult[] => [
      { type: ToolResultType.other, tool_result_id: `r${n}`, data: { value: `RAW_${n}` } },
    ];
    const rawResult = (n: number) => JSON.stringify({ results: rawResults(n) });

    const makeCycle = (n: number): ResearchAgentAction[] => [
      makeToolCallAction(
        [{ toolCallId: `c${n}`, toolName: 'search', args: { q: 'foo' } }],
        undefined,
        n
      ),
      makeExecuteToolAction(
        [{ toolCallId: `c${n}`, content: rawResult(n), artifact: { results: rawResults(n) } }],
        n
      ),
    ];

    const toolMessageById = (messages: BaseMessageLike[], id: string): ToolMessage | undefined =>
      messages
        .filter((message): message is ToolMessage => isToolMessage(message as any))
        .find((message) => message.tool_call_id === id);

    it('renders results through the transformer, mapping the tool id from the manager', async () => {
      const resultTransformer: ToolCallResultTransformer = jest.fn(async () => [
        { type: ToolResultType.other, tool_result_id: 'sum', data: { summary: 'transformed' } },
      ]);

      const messages = await formatResearcherActionHistory({
        actions: [...makeCycle(1)],
        cycleLimit: 100,
        resultTransformer,
        toolManager: mockToolManager,
      });

      expect(resultTransformer).toHaveBeenCalledWith(
        expect.objectContaining({ tool_call_id: 'c1', tool_id: 'platform.search' })
      );
      expect(toolMessageById(messages, 'c1')!.content).toContain('transformed');
      expect(toolMessageById(messages, 'c1')!.content).not.toContain('RAW_1');
    });

    it('keeps the raw content when the transformer returns the results untouched', async () => {
      const resultTransformer: ToolCallResultTransformer = jest.fn(async (tc) => tc.results);

      const messages = await formatResearcherActionHistory({
        actions: [...makeCycle(1)],
        cycleLimit: 100,
        resultTransformer,
        toolManager: mockToolManager,
      });

      expect(toolMessageById(messages, 'c1')!.content).toContain(rawResult(1));
    });

    it('skips actions before fromActionIndex', async () => {
      const actions: ResearchAgentAction[] = [...makeCycle(1), ...makeCycle(2)];

      const messages = await formatResearcherActionHistory({
        actions,
        cycleLimit: 100,
        fromActionIndex: 2,
      });

      expect(toolMessageById(messages, 'c1')).toBeUndefined();
      expect(toolMessageById(messages, 'c2')!.content).toContain('RAW_2');
    });

    it('renders nothing for substitution and context-length-error actions', async () => {
      const error = createAgentExecutionError(
        'too long',
        AgentExecutionErrorCode.contextLengthExceeded,
        {}
      );
      const messages = await formatResearcherActionHistory({
        actions: [
          substitutionAction({
            substituted_tool_call_ids: ['c1'],
            trigger: 'intra_round',
            reason: 'input_tokens_threshold',
          }),
          contextLengthErrorAction(error),
        ],
        cycleLimit: 100,
      });

      expect(messages).toEqual([]);
    });

    it('keeps tool results verbatim when no transformer is wired', async () => {
      const messages = await formatResearcherActionHistory({
        actions: [...makeCycle(1)],
        cycleLimit: 100,
      });

      expect(toolMessageById(messages, 'c1')!.content).toContain(rawResult(1));
    });
  });
});

describe('image injection', () => {
  const makeImageToolResult = (overrides: {
    toolCallId: string;
    attachmentId: string;
    mimeType?: string;
    name?: string;
  }) => ({
    toolCallId: overrides.toolCallId,
    content: 'ignored',
    artifact: {
      results: [
        {
          tool_result_id: `r-${overrides.attachmentId}`,
          type: ToolResultType.image,
          data: {
            attachment_id: overrides.attachmentId,
            mime_type: overrides.mimeType ?? 'image/png',
            name: overrides.name,
            description: 'an image',
          },
        },
      ],
    },
  });

  it('does not inject anything when no imageResolver is provided', async () => {
    const actions: ResearchAgentAction[] = [
      makeToolCallAction([{ toolCallId: 'c1', toolName: 'attachment_read' }]),
      makeExecuteToolAction([makeImageToolResult({ toolCallId: 'c1', attachmentId: 'img-1' })]),
    ];

    const messages = await formatResearcherActionHistory({ actions, cycleLimit: 100 });

    expect(messages.filter((m) => isHumanMessage(m as any))).toHaveLength(0);
  });

  it('appends a HumanMessage with the attachment_image envelope and an image_url part', async () => {
    const actions: ResearchAgentAction[] = [
      makeToolCallAction([{ toolCallId: 'c1', toolName: 'attachment_read' }]),
      makeExecuteToolAction([makeImageToolResult({ toolCallId: 'c1', attachmentId: 'img-1' })]),
    ];
    const imageResolver = jest.fn().mockResolvedValue({ base64: 'AAA', mimeType: 'image/png' });

    const messages = await formatResearcherActionHistory({
      actions,
      cycleLimit: 100,
      imageResolver,
    });

    expect(imageResolver).toHaveBeenCalledWith({ attachmentId: 'img-1' });
    const humanMessages = messages.filter((m) => isHumanMessage(m as any));
    expect(humanMessages).toHaveLength(1);
    const content = (humanMessages[0] as any).content;
    expect(content[0].type).toBe('text');
    expect(content[0].text).toContain('<attachment_image attachment_id="img-1"');
    expect(content[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,AAA' },
    });
  });

  it('carries multiple images from one action in a single HumanMessage', async () => {
    const actions: ResearchAgentAction[] = [
      makeToolCallAction([
        { toolCallId: 'c1', toolName: 'attachment_read' },
        { toolCallId: 'c2', toolName: 'attachment_read' },
      ]),
      makeExecuteToolAction([
        makeImageToolResult({ toolCallId: 'c1', attachmentId: 'img-1' }),
        makeImageToolResult({ toolCallId: 'c2', attachmentId: 'img-2', mimeType: 'image/jpeg' }),
      ]),
    ];
    const imageResolver = jest
      .fn()
      .mockImplementation(async ({ attachmentId }: { attachmentId: string }) => ({
        base64: `data-${attachmentId}`,
        mimeType: attachmentId === 'img-1' ? 'image/png' : 'image/jpeg',
      }));

    const messages = await formatResearcherActionHistory({
      actions,
      cycleLimit: 100,
      imageResolver,
    });

    const humanMessages = messages.filter((m) => isHumanMessage(m as any));
    expect(humanMessages).toHaveLength(1);
    const content = (humanMessages[0] as any).content;
    const imageParts = content.filter((part: any) => part.type === 'image_url');
    expect(imageParts).toHaveLength(2);
    expect(imageParts[0].image_url.url).toBe('data:image/png;base64,data-img-1');
    expect(imageParts[1].image_url.url).toBe('data:image/jpeg;base64,data-img-2');
  });

  it('pushes a system-notice HumanMessage and no image part when the resolver returns undefined', async () => {
    const actions: ResearchAgentAction[] = [
      makeToolCallAction([{ toolCallId: 'c1', toolName: 'attachment_read' }]),
      makeExecuteToolAction([
        makeImageToolResult({ toolCallId: 'c1', attachmentId: 'img-1', name: 'screenshot.png' }),
      ]),
    ];
    const imageResolver = jest.fn().mockResolvedValue(undefined);

    const messages = await formatResearcherActionHistory({
      actions,
      cycleLimit: 100,
      imageResolver,
    });

    const humanMessages = messages.filter((m) => isHumanMessage(m as any));
    expect(humanMessages).toHaveLength(1);
    expect((humanMessages[0] as any).content).toContain('<system-notice>');
    expect((humanMessages[0] as any).content).toContain('screenshot.png');
    expect((humanMessages[0] as any).content).toContain('could not be loaded');
  });

  it('does not inject the image when the transformer replaced the tool result', async () => {
    const mockToolManager = {
      getToolIdMapping: () => new Map<string, string>(),
    } as unknown as ToolManager;
    const resultTransformer: ToolCallResultTransformer = jest.fn(async () => [
      { type: ToolResultType.other, tool_result_id: 'sum', data: { summary: 'substituted' } },
    ]);
    const imageResolver = jest.fn().mockResolvedValue({ base64: 'AAA', mimeType: 'image/png' });

    const actions: ResearchAgentAction[] = [
      makeToolCallAction([{ toolCallId: 'c1', toolName: 'attachment_read' }], undefined, 1),
      makeExecuteToolAction([makeImageToolResult({ toolCallId: 'c1', attachmentId: 'img-1' })], 1),
    ];

    const messages = await formatResearcherActionHistory({
      actions,
      cycleLimit: 100,
      resultTransformer,
      toolManager: mockToolManager,
      imageResolver,
    });

    const imageParts = messages
      .filter((m): m is BaseMessage => isHumanMessage(m as any))
      .flatMap((m) => (Array.isArray(m.content) ? m.content : []))
      .filter((part: any) => part.type === 'image_url');
    expect(imageParts).toHaveLength(0);
    expect(imageResolver).not.toHaveBeenCalled();
  });
});

describe('formatSystemNotice', () => {
  it('formats a completed execution as a system notice with result', () => {
    const notice = formatSystemNotice(makeCompletedExecution());

    expect(notice).toContain('<system_notice>');
    expect(notice).toContain('</system_notice>');
    expect(notice).toContain('<execution-id>exec-123</execution-id>');
    expect(notice).toContain('<status>completed</status>');
    expect(notice).toContain('<result>The task is done.</result>');
    expect(notice).not.toContain('<error>');
  });

  it('formats a failed execution as a system notice with error', () => {
    const notice = formatSystemNotice(makeFailedExecution());

    expect(notice).toContain('<system_notice>');
    expect(notice).toContain('has failed');
    expect(notice).toContain('<execution-id>exec-456</execution-id>');
    expect(notice).toContain('<status>failed</status>');
    expect(notice).toContain('<error>LLM timeout</error>');
    expect(notice).not.toContain('<result>');
  });

  it('uses "No response" when completed execution has no response', () => {
    const notice = formatSystemNotice(makeCompletedExecution({ response: undefined }));

    expect(notice).toContain('<result>No response</result>');
  });
});
