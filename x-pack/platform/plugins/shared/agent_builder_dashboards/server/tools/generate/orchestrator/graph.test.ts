/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { runDashboardOrchestrator } from './run_orchestrator';

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const buildChatModel = (responses: AIMessage[]) => {
  const invoke = jest.fn(
    (messages: BaseMessage[]): Promise<AIMessage> => Promise.resolve(responses.shift()!)
  );
  const bindTools = jest.fn((_tools: Array<{ name: string }>) => ({ invoke }));
  const chatModel = {
    invoke,
    bindTools,
  };
  return { chatModel, invoke, bindTools };
};

const baseDeps = (chatModel: unknown) => ({
  model: { chatModel } as ScopedModel,
  logger: createMockLogger(),
});

describe('dashboard orchestrator graph (routing)', () => {
  it('routes agent → finalize when the agent emits no tool calls', async () => {
    const { chatModel, invoke, bindTools } = buildChatModel([
      new AIMessage({ content: 'all done' }),
    ]);

    const result = await runDashboardOrchestrator({
      request: 'a simple dashboard',
      ...baseDeps(chatModel),
    });

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(result.response).toBe('all done');
    expect(result.dashboard).toEqual({
      title: 'User Dashboard',
      description: undefined,
      panels: [],
    });
    expect((bindTools.mock.lastCall?.[0] ?? []).map(({ name }) => name)).not.toContain(
      'critique_dashboard'
    );
  });

  it('routes agent → tools → agent and feeds tool errors back without reporting them as panel failures', async () => {
    const { chatModel, invoke } = buildChatModel([
      new AIMessage({
        content: '',
        tool_calls: [{ id: '1', name: 'nonexistent_tool', args: {} }],
      }),
      new AIMessage({ content: 'done' }),
    ]);

    const result = await runDashboardOrchestrator({
      request: 'q',
      ...baseDeps(chatModel),
    });

    expect(invoke).toHaveBeenCalledTimes(2);

    const secondTurnMessages = invoke.mock.calls[1][0];
    const toolMessages = secondTurnMessages.filter(
      (message: BaseMessage): message is ToolMessage => message instanceof ToolMessage
    );
    expect(toolMessages).toHaveLength(1);
    expect(toolMessages[0].tool_call_id).toBe('1');
    expect(String(toolMessages[0].content)).toContain('Unknown tool: nonexistent_tool');
    expect(result.failures).toEqual([]);
    expect(result.response).toBe('done');
  });

  it('feeds the post-edit dashboard summary back to the agent after a mutating call', async () => {
    const { chatModel, invoke } = buildChatModel([
      new AIMessage({
        content: '',
        tool_calls: [{ id: '1', name: 'set_metadata', args: { title: 'Sales KPIs' } }],
      }),
      new AIMessage({ content: 'done' }),
    ]);

    const result = await runDashboardOrchestrator({
      request: 'name it Sales KPIs',
      ...baseDeps(chatModel),
    });

    const secondTurnMessages = invoke.mock.calls[1][0];
    const toolMessages = secondTurnMessages.filter(
      (message: BaseMessage): message is ToolMessage => message instanceof ToolMessage
    );
    expect(toolMessages).toHaveLength(1);
    const content = JSON.parse(String(toolMessages[0].content));
    expect(content.currentDashboard.title).toBe('Sales KPIs');
    expect(result.dashboard.title).toBe('Sales KPIs');
  });

  it('threads the dashboard sequentially through multiple tool calls in one turn', async () => {
    const { chatModel, invoke } = buildChatModel([
      new AIMessage({
        content: '',
        tool_calls: [
          { id: '1', name: 'set_metadata', args: { title: 'First' } },
          { id: '2', name: 'set_metadata', args: { description: 'Second' } },
        ],
      }),
      new AIMessage({ content: 'done' }),
    ]);

    const result = await runDashboardOrchestrator({
      request: 'q',
      ...baseDeps(chatModel),
    });

    expect(result.dashboard.title).toBe('First');
    expect(result.dashboard.description).toBe('Second');

    const secondTurnMessages = invoke.mock.calls[1][0];
    const toolMessages = secondTurnMessages.filter(
      (message: BaseMessage): message is ToolMessage => message instanceof ToolMessage
    );
    expect(toolMessages).toHaveLength(2);
    const secondContent = JSON.parse(String(toolMessages[1].content));
    expect(secondContent.currentDashboard.title).toBe('First');
  });

  it('injects the existing dashboard summary into the first user prompt when editing', async () => {
    const { chatModel, invoke, bindTools } = buildChatModel([new AIMessage({ content: 'done' })]);

    await runDashboardOrchestrator({
      request: 'remove the cpu panel',
      dashboard: {
        title: 'Existing',
        description: undefined,
        panels: [
          {
            type: 'lens',
            id: 'panel-cpu',
            config: {},
            grid: { x: 0, y: 0, w: 24, h: 9 },
          },
        ],
      },
      ...baseDeps(chatModel),
    });

    const firstTurnMessages = invoke.mock.calls[0][0];
    const humanMessages = firstTurnMessages.filter(
      (message: BaseMessage) => message instanceof HumanMessage
    );
    expect(String(humanMessages[0].content)).toContain('panel-cpu');
    expect(String(humanMessages[0].content)).toContain('dashboard-to-edit');
    expect((bindTools.mock.lastCall?.[0] ?? []).map(({ name }) => name)).toContain(
      'critique_dashboard'
    );
  });

  const addPanelsCall = ({
    id,
    query,
    resolvesFailureId,
  }: {
    id: string;
    query: string;
    resolvesFailureId?: string;
  }) =>
    new AIMessage({
      content: '',
      tool_calls: [
        {
          id,
          name: 'add_panels',
          args: {
            panels: [
              {
                source: 'request',
                type: 'vis',
                grid: { x: 0, y: 0, w: 24, h: 9 },
                query,
                ...(resolvesFailureId ? { resolvesFailureId } : {}),
              },
            ],
          },
        },
      ],
    });

  it('omits a terminal panel failure after the agent successfully recovers it', async () => {
    const { chatModel, invoke } = buildChatModel([
      addPanelsCall({ id: '1', query: 'broken' }),
      addPanelsCall({ id: '2', query: 'adjusted', resolvesFailureId: 'failure-1' }),
      new AIMessage({ content: 'recovered the panel' }),
    ]);

    const resolvePanelContent = jest
      .fn()
      .mockResolvedValueOnce({
        type: 'failure',
        failure: {
          failureId: 'failure-1',
          failureKind: 'visualization_generation',
          type: 'add_panels',
          identifier: 'broken',
          error: 'no such index',
        },
      })
      .mockResolvedValueOnce({
        type: 'success',
        panelContent: { type: 'lens', config: { type: 'metric' } },
      });

    const result = await runDashboardOrchestrator({
      request: 'q',
      resolvePanelContent,
      ...baseDeps(chatModel),
    });

    expect(invoke).toHaveBeenCalledTimes(3);
    expect(result.dashboard.panels).toHaveLength(1);
    expect(result.failures).toEqual([]);
  });

  it('keeps one terminal failure with the latest error when recovery also fails', async () => {
    const { chatModel } = buildChatModel([
      addPanelsCall({ id: '1', query: 'broken' }),
      addPanelsCall({ id: '2', query: 'adjusted', resolvesFailureId: 'failure-1' }),
      new AIMessage({ content: 'could not produce that panel' }),
    ]);

    const resolvePanelContent = jest
      .fn()
      .mockResolvedValueOnce({
        type: 'failure',
        failure: {
          failureId: 'failure-1',
          failureKind: 'visualization_generation',
          type: 'add_panels',
          identifier: 'broken',
          error: 'no such index',
        },
      })
      .mockResolvedValueOnce({
        type: 'failure',
        failure: {
          failureId: 'failure-1',
          failureKind: 'visualization_generation',
          type: 'add_panels',
          identifier: 'adjusted',
          error: 'field not found',
        },
      });

    const result = await runDashboardOrchestrator({
      request: 'q',
      resolvePanelContent,
      ...baseDeps(chatModel),
    });

    expect(result.failures).toEqual([
      { type: 'add_panels', identifier: 'adjusted', error: 'field not found' },
    ]);
  });

  it('keeps the terminal failure when a linked recovery has only an operation error', async () => {
    const { chatModel, invoke } = buildChatModel([
      addPanelsCall({ id: '1', query: 'broken' }),
      new AIMessage({
        content: '',
        tool_calls: [
          {
            id: '2',
            name: 'edit_panels',
            args: {
              panels: [
                {
                  source: 'request',
                  type: 'vis',
                  panelId: 'missing',
                  query: 'try the existing panel instead',
                  resolvesFailureId: 'failure-1',
                },
              ],
            },
          },
        ],
      }),
      new AIMessage({ content: 'could not recover the panel' }),
    ]);
    const resolvePanelContent = jest.fn().mockResolvedValueOnce({
      type: 'failure',
      failure: {
        failureId: 'failure-1',
        failureKind: 'visualization_generation',
        type: 'add_panels',
        identifier: 'broken',
        error: 'no such index',
      },
    });

    const result = await runDashboardOrchestrator({
      request: 'q',
      resolvePanelContent,
      ...baseDeps(chatModel),
    });

    const recoveryFeedback = invoke.mock.calls[2][0].find(
      (message: BaseMessage): message is ToolMessage =>
        message instanceof ToolMessage && message.tool_call_id === '2'
    );
    const feedbackContent = JSON.parse(String(recoveryFeedback?.content));
    expect(feedbackContent.failures[0]).toEqual(
      expect.objectContaining({ failureId: 'failure-1', identifier: 'missing' })
    );
    expect(feedbackContent.failures[0]).not.toHaveProperty('failureKind');
    expect(result.failures).toEqual([
      { type: 'add_panels', identifier: 'broken', error: 'no such index' },
    ]);
  });

  it('preserves a terminal panel failure across unrelated successful mutations', async () => {
    const { chatModel, invoke } = buildChatModel([
      addPanelsCall({ id: '1', query: 'broken' }),
      new AIMessage({
        content: '',
        tool_calls: [{ id: '2', name: 'set_metadata', args: { title: 'Useful title' } }],
      }),
      new AIMessage({ content: 'finished' }),
    ]);

    const resolvePanelContent = jest.fn().mockResolvedValueOnce({
      type: 'failure',
      failure: {
        failureKind: 'visualization_generation',
        type: 'add_panels',
        identifier: 'broken',
        error: 'no such index',
      },
    });

    const result = await runDashboardOrchestrator({
      request: 'q',
      resolvePanelContent,
      ...baseDeps(chatModel),
    });

    expect(result.failures).toEqual([
      { type: 'add_panels', identifier: 'broken', error: 'no such index' },
    ]);
    expect(result.dashboard.title).toBe('Useful title');

    const failureFeedback = invoke.mock.calls[1][0].find(
      (message: BaseMessage): message is ToolMessage => message instanceof ToolMessage
    );
    const feedbackContent = JSON.parse(String(failureFeedback?.content));
    expect(feedbackContent.failures[0].failureId).toEqual(expect.any(String));
  });

  it('feeds an operation failure back without reporting it as an unresolved generation failure', async () => {
    const { chatModel, invoke } = buildChatModel([
      new AIMessage({
        content: '',
        tool_calls: [
          {
            id: '1',
            name: 'update_panel_layouts',
            args: {
              panels: [{ panelId: 'missing', grid: { x: 0, y: 0, w: 24, h: 9 } }],
            },
          },
        ],
      }),
      new AIMessage({ content: 'skipped the missing panel' }),
    ]);

    const result = await runDashboardOrchestrator({
      request: 'move the panel',
      ...baseDeps(chatModel),
    });

    const feedback = invoke.mock.calls[1][0].find(
      (message: BaseMessage): message is ToolMessage => message instanceof ToolMessage
    );
    const feedbackContent = JSON.parse(String(feedback?.content));
    expect(feedbackContent.failures).toEqual([
      expect.objectContaining({ identifier: 'missing', type: 'update_panel_layouts' }),
    ]);
    expect(feedbackContent.failures[0]).not.toHaveProperty('failureId');
    expect(result.failures).toEqual([]);
  });

  it('does not report a fail-closed resolver policy skip as an exhausted builder failure', async () => {
    const { chatModel, invoke } = buildChatModel([
      addPanelsCall({ id: '1', query: 'restyle unsupported data' }),
      new AIMessage({ content: 'skipped the unsupported panel' }),
    ]);
    const resolvePanelContent = jest.fn().mockResolvedValueOnce({
      type: 'failure',
      failure: {
        type: 'add_panels',
        identifier: 'restyle unsupported data',
        error: 'The panel cannot be edited without changing its data semantics.',
      },
    });

    const result = await runDashboardOrchestrator({
      request: 'q',
      resolvePanelContent,
      ...baseDeps(chatModel),
    });

    const feedback = invoke.mock.calls[1][0].find(
      (message: BaseMessage): message is ToolMessage => message instanceof ToolMessage
    );
    const feedbackContent = JSON.parse(String(feedback?.content));
    expect(feedbackContent.failures[0]).not.toHaveProperty('failureKind');
    expect(result.failures).toEqual([]);
  });

  it('dispatches the current tool calls and then finalizes when the agent turn bound is reached', async () => {
    const toolCallMessage = (id: string) =>
      new AIMessage({
        content: '',
        tool_calls: [{ id, name: 'set_metadata', args: { title: `Turn ${id}` } }],
      });
    const { chatModel, invoke } = buildChatModel([
      toolCallMessage('1'),
      toolCallMessage('2'),
      toolCallMessage('3'),
      new AIMessage({ content: 'Final summary with material decisions.' }),
    ]);

    const result = await runDashboardOrchestrator({
      request: 'q',
      maxAgentTurns: 3,
      ...baseDeps(chatModel),
    });

    expect(invoke).toHaveBeenCalledTimes(4);
    expect(result.dashboard.title).toBe('Turn 3');
    expect(result.response).toBe('Final summary with material decisions.');
    expect(String(invoke.mock.calls[3][0].at(-1)?.content)).toContain(
      'tool-call budget is exhausted'
    );
  });
});
