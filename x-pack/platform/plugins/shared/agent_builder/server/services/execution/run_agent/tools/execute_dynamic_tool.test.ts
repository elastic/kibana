/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  ChatEventType,
  internalTools,
  ToolOrigin,
  ToolResultType,
  ToolType,
} from '@kbn/agent-builder-common';
import { isExcludedFromFilestore, isInternalTool } from '@kbn/agent-builder-common/tools';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import {
  isDynamicToolRunReturn,
  toDynamicToolEvent,
  type AgentBuilderToolEvent,
} from '@kbn/agent-builder-server/runner';
import type { ExecutableToolWithOrigin } from '@kbn/agent-builder-server/runner/tool_manager';
import { createToolManagerMock, type ToolManagerMock } from '../../../../test_utils/runner';
import { createExecuteDynamicTool } from './execute_dynamic_tool';

const createInnerTool = (
  overrides: Partial<ExecutableToolWithOrigin> = {}
): ExecutableToolWithOrigin => ({
  id: 'platform.core.cases',
  type: ToolType.builtin,
  origin: ToolOrigin.registry,
  description: 'Search cases',
  tags: [],
  configuration: {},
  readonly: true,
  experimental: false,
  getSchema: () => z.object({ query: z.string(), limit: z.number().optional() }),
  execute: jest.fn().mockResolvedValue({ results: [] }),
  ...overrides,
});

const errorMessages = (result: { results?: Array<{ type: string; data: unknown }> }) =>
  (result.results ?? [])
    .filter((r) => r.type === ToolResultType.error)
    .map((r) => (r.data as { message: string }).message);

describe('execute_dynamic_tool', () => {
  let toolManager: ToolManagerMock;
  let inner: ExecutableToolWithOrigin;

  beforeEach(() => {
    toolManager = createToolManagerMock();
    inner = createInnerTool();
    toolManager.getDynamicTool.mockImplementation((id) => (id === inner.id ? inner : undefined));
    toolManager.getExecutable.mockImplementation((id) => (id === inner.id ? inner : undefined));
    toolManager.listDynamicTools.mockReturnValue([inner]);
    toolManager.getToolMeta.mockReturnValue({ origin: undefined, type: undefined });
  });

  const execute = (toolParams: Record<string, unknown>) =>
    createExecuteDynamicTool({ toolManager }).execute({
      toolParams,
      toolCallId: 'call-1',
      source: 'agent',
    });

  it('is an internal tool kept out of the filestore', () => {
    const tool = createExecuteDynamicTool({ toolManager });
    expect(tool.id).toBe(internalTools.executeDynamicTool);
    expect(tool.id).toBe('execute_dynamic_tool');
    expect(tool.origin).toBe(ToolOrigin.internal);
    expect(isInternalTool(tool.id)).toBe(true);
    expect(isExcludedFromFilestore(tool.id)).toBe(true);
  });

  it('requires tool_id and params in its own schema', () => {
    const schema = createExecuteDynamicTool({ toolManager }).getSchema() as z.ZodObject<any>;
    expect(schema.safeParse({ tool_id: 'a', params: {} }).success).toBe(true);
    expect(schema.safeParse({ tool_id: 'a' }).success).toBe(false);
    expect(schema.safeParse({ params: {} }).success).toBe(false);
  });

  it('dispatches to the inner tool with the outer call id, source and validated params', async () => {
    const onEvent = jest.fn();
    const abortSignal = new AbortController().signal;
    (inner.execute as jest.Mock).mockResolvedValue({
      results: [{ type: 'other', data: { ok: 1 } }],
    });

    const result = await createExecuteDynamicTool({ toolManager }).execute({
      toolParams: { tool_id: inner.id, params: { query: 'open', limit: 5 } },
      toolCallId: 'call-1',
      source: 'agent',
      onEvent,
      abortSignal,
    });

    expect(inner.execute).toHaveBeenCalledWith({
      toolParams: { query: 'open', limit: 5 },
      toolCallId: 'call-1',
      source: 'agent',
      onEvent: expect.any(Function),
      abortSignal,
    });
    // the return is tagged with the inner tool id so the result content is attributed to it
    expect(result).toEqual({
      results: [{ type: 'other', data: { ok: 1 } }],
      dynamicToolId: 'platform.core.cases',
    });
    expect(isDynamicToolRunReturn(result)).toBe(true);
  });

  it('does not tag the error returns: nothing was dispatched, so nothing is attributed', async () => {
    const invalid = await execute({ tool_id: inner.id, params: { limit: 'five' } });
    const unknown = await execute({ tool_id: 'nope', params: {} });

    expect(isDynamicToolRunReturn(invalid)).toBe(false);
    expect(isDynamicToolRunReturn(unknown)).toBe(false);
  });

  it("tags the inner tool's events with its id so they are attributed to it", async () => {
    const onEvent = jest.fn();
    const uiEvent: AgentBuilderToolEvent = {
      type: ChatEventType.toolUi,
      data: { custom_event: 'ev', data: {} },
    };
    const progress: AgentBuilderToolEvent = {
      type: ChatEventType.toolProgress,
      data: { message: 'hi' },
    };
    (inner.execute as jest.Mock).mockImplementation(async (params) => {
      params.onEvent(uiEvent);
      params.onEvent(progress);
      return { results: [] };
    });

    await createExecuteDynamicTool({ toolManager }).execute({
      toolParams: { tool_id: inner.id, params: { query: 'x' } },
      toolCallId: 'call-1',
      source: 'agent',
      onEvent,
    });

    expect(onEvent).toHaveBeenNthCalledWith(1, toDynamicToolEvent(inner.id, uiEvent));
    expect(onEvent).toHaveBeenNthCalledWith(2, toDynamicToolEvent(inner.id, progress));
    expect(onEvent.mock.calls[0][0]).toEqual({
      type: 'dynamic_tool_event',
      data: { tool_id: 'platform.core.cases', event: uiEvent },
    });
  });

  it('passes no onEvent to the inner tool when the outer call has none', async () => {
    await execute({ tool_id: inner.id, params: { query: 'x' } });

    expect(inner.execute).toHaveBeenCalledWith(expect.objectContaining({ onEvent: undefined }));
  });

  it('passes an interrupt return through, tagged', async () => {
    const prompt = {
      id: 'prompt-1',
      type: AgentPromptType.confirmation,
      title: 'Allow?',
      message: 'Allow the call?',
      confirm_text: 'Yes',
      cancel_text: 'No',
    };
    (inner.execute as jest.Mock).mockResolvedValue({ prompt });

    const result = await execute({ tool_id: inner.id, params: { query: 'x' } });

    expect(result).toEqual({ prompt, dynamicToolId: 'platform.core.cases' });
  });

  it('returns a validation error with the provider wording when params do not match', async () => {
    const result = await execute({ tool_id: inner.id, params: { limit: 'five' } });

    expect(inner.execute).not.toHaveBeenCalled();
    const [message] = errorMessages(result);
    expect(message).toMatch(/^Tool call arguments for platform\.core\.cases were invalid: /);
    expect(message).toContain('query:');
    expect(message).toContain('limit:');
  });

  it('returns an error listing the available dynamic tools for an unknown id', async () => {
    const result = await execute({ tool_id: 'nope', params: {} });

    expect(errorMessages(result)).toEqual([
      "Dynamic tool 'nope' is not available. Available dynamic tools: platform.core.cases.",
    ]);
  });

  it('says so when no dynamic tools are registered', async () => {
    toolManager.getDynamicTool.mockReturnValue(undefined);
    toolManager.getExecutable.mockReturnValue(undefined);
    toolManager.listDynamicTools.mockReturnValue([]);

    const result = await execute({ tool_id: 'nope', params: {} });

    expect(errorMessages(result)).toEqual([
      "Dynamic tool 'nope' is not available. No dynamic tools are available.",
    ]);
  });

  it('falls back to a natively bound tool called by the wrong path', async () => {
    const native = createInnerTool({ id: 'platform.core.search', origin: ToolOrigin.registry });
    toolManager.getDynamicTool.mockReturnValue(undefined);
    toolManager.getExecutable.mockImplementation((id) => (id === native.id ? native : undefined));
    toolManager.getToolMeta.mockImplementation((id) =>
      id === native.id
        ? { origin: ToolOrigin.registry, type: ToolType.builtin }
        : { origin: undefined, type: undefined }
    );

    const result = await execute({ tool_id: native.id, params: { query: 'x' } });

    expect(native.execute).toHaveBeenCalledWith(
      expect.objectContaining({ toolParams: { query: 'x' }, toolCallId: 'call-1' })
    );
    expect(result).toMatchObject({ dynamicToolId: 'platform.core.search' });
  });

  it('never falls back to an internal tool', async () => {
    const internal = createInnerTool({ id: 'ask_user_question', origin: ToolOrigin.internal });
    toolManager.getDynamicTool.mockReturnValue(undefined);
    toolManager.getExecutable.mockImplementation((id) =>
      id === internal.id ? internal : undefined
    );
    toolManager.getToolMeta.mockImplementation((id) =>
      id === internal.id
        ? { origin: ToolOrigin.internal, type: ToolType.builtin }
        : { origin: undefined, type: undefined }
    );

    const result = await execute({ tool_id: internal.id, params: {} });

    expect(errorMessages(result)).toEqual([
      "Tool 'ask_user_question' is an internal tool in your tool list: call it directly, not through execute_dynamic_tool.",
    ]);
    expect(internal.execute).not.toHaveBeenCalled();
  });
});
