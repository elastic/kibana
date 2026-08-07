/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStatus, type ConversationRound } from '@kbn/agent-builder-common';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import {
  AgentPromptType,
  type PromptRequest,
  type PromptStorageState,
} from '@kbn/agent-builder-common/agents/prompts';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { pendingBrowserToolPromptsToActions } from './pending_browser_tool_prompts_to_actions';
import { AgentActionType } from '../actions';

const BLUE_PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const browserToolPrompt = (
  id: string,
  toolId = 'get_time_range',
  resultType?: 'json' | 'image'
): PromptRequest => ({
  type: AgentPromptType.browser_tool_call,
  id,
  tool_id: toolId,
  params: { verbose: true },
  ...(resultType ? { result_type: resultType } : {}),
});

const makeRound = (...pendingPrompts: PromptRequest[]): ConversationRound =>
  ({
    id: 'r1',
    status: ConversationRoundStatus.awaitingPrompt,
    input: { message: '', attachments: [] },
    started_at: '2026-06-04T00:00:00.000Z',
    time_to_first_token: 0,
    time_to_last_token: 0,
    response: { message: '' },
    steps: [],
    pending_prompts: pendingPrompts,
  } as unknown as ConversationRound);

const createMockAttachmentStateManager = () => {
  return {
    getAttachmentRecord: jest.fn().mockReturnValue(undefined),
    add: jest.fn().mockImplementation(async (input: { id?: string }) => ({
      id: input.id ?? 'generated-attachment-id',
    })),
    update: jest.fn().mockResolvedValue({ id: 'updated' }),
  } as unknown as jest.Mocked<AttachmentStateManager>;
};

describe('pendingBrowserToolPromptsToActions', () => {
  let attachmentStateManager: jest.Mocked<AttachmentStateManager>;
  let eventEmitter: jest.Mock;

  beforeEach(() => {
    attachmentStateManager = createMockAttachmentStateManager();
    eventEmitter = jest.fn();
  });

  it('emits a toolCall + executeTool action pair carrying the result the browser reported', async () => {
    const round = makeRound(browserToolPrompt('p1'));
    const promptState: PromptStorageState = {
      responses: {
        p1: {
          type: AgentPromptType.browser_tool_call,
          response: { result: '{"from":"now-15m","to":"now"}' },
        },
      },
    };

    const result = await pendingBrowserToolPromptsToActions({
      round,
      promptState,
      attachmentStateManager,
      eventEmitter,
    });

    expect(result.actions).toHaveLength(2);
    const [toolCallAction, executeToolAction] = result.actions as any[];
    expect(toolCallAction.type).toBe(AgentActionType.ToolCall);
    expect(toolCallAction.tool_calls[0].toolName).toBe('browser_get_time_range');
    expect(toolCallAction.tool_calls[0].args).toEqual({ verbose: true });
    expect(executeToolAction.type).toBe(AgentActionType.ExecuteTool);
    expect(executeToolAction.tool_results[0].content).toBe('{"from":"now-15m","to":"now"}');
    expect(toolCallAction.tool_calls[0].toolCallId).toBe(
      executeToolAction.tool_results[0].toolCallId
    );
    expect(result.consumedPromptIds).toEqual(['p1']);
  });

  it('surfaces the failure to the model when the browser reported an error', async () => {
    const round = makeRound(browserToolPrompt('p1'));
    const promptState: PromptStorageState = {
      responses: {
        p1: {
          type: AgentPromptType.browser_tool_call,
          response: { error: 'Timed out after 30000ms.' },
        },
      },
    };

    const result = await pendingBrowserToolPromptsToActions({
      round,
      promptState,
      attachmentStateManager,
      eventEmitter,
    });

    const [, executeToolAction] = result.actions as any[];
    expect(executeToolAction.tool_results[0].content).toBe(
      JSON.stringify({ error: 'Timed out after 30000ms.' })
    );
  });

  it('handles one pair per pending prompt', async () => {
    const round = makeRound(browserToolPrompt('p1', 'tool_a'), browserToolPrompt('p2', 'tool_b'));
    const promptState: PromptStorageState = {
      responses: {
        p1: { type: AgentPromptType.browser_tool_call, response: { result: '1' } },
        p2: { type: AgentPromptType.browser_tool_call, response: { result: '2' } },
      },
    };

    const result = await pendingBrowserToolPromptsToActions({
      round,
      promptState,
      attachmentStateManager,
      eventEmitter,
    });

    expect(result.actions).toHaveLength(4);
    expect(result.consumedPromptIds).toEqual(['p1', 'p2']);
    // Pairs must stay adjacent: the prompt formatter drops a tool call that is not
    // immediately followed by its result.
    expect(result.actions.map((action) => action.type)).toEqual([
      AgentActionType.ToolCall,
      AgentActionType.ExecuteTool,
      AgentActionType.ToolCall,
      AgentActionType.ExecuteTool,
    ]);
  });

  it('ignores prompts of other types', async () => {
    const round = makeRound({
      type: AgentPromptType.confirmation,
      id: 'c1',
    } as PromptRequest);

    const result = await pendingBrowserToolPromptsToActions({
      round,
      promptState: { responses: {} },
      attachmentStateManager,
      eventEmitter,
    });

    expect(result.actions).toEqual([]);
    expect(result.consumedPromptIds).toEqual([]);
  });

  it('returns nothing when the round has no pending prompts', async () => {
    const result = await pendingBrowserToolPromptsToActions({
      round: makeRound(),
      promptState: { responses: {} },
      attachmentStateManager,
      eventEmitter,
    });

    expect(result.actions).toEqual([]);
  });

  it('throws when no response was submitted for a pending prompt', async () => {
    const round = makeRound(browserToolPrompt('p1'));

    await expect(
      pendingBrowserToolPromptsToActions({
        round,
        promptState: { responses: {} },
        attachmentStateManager,
        eventEmitter,
      })
    ).rejects.toThrow(/No browser_tool_call response found in prompt state for prompt_id p1/);
  });

  describe('transcript step events', () => {
    it('emits toolCall + toolResult events so the run is persisted as a step', async () => {
      const round = makeRound(browserToolPrompt('p1'));
      const promptState: PromptStorageState = {
        responses: {
          p1: {
            type: AgentPromptType.browser_tool_call,
            response: { result: '{"from":"now-15m","to":"now"}' },
          },
        },
      };

      await pendingBrowserToolPromptsToActions({
        round,
        promptState,
        attachmentStateManager,
        eventEmitter,
      });

      expect(eventEmitter).toHaveBeenCalledTimes(2);
      const [toolCallEvent, toolResultEvent] = eventEmitter.mock.calls.map(([event]) => event);
      expect(toolCallEvent.type).toBe('tool_call');
      expect(toolCallEvent.data.tool_id).toBe('browser_get_time_range');
      expect(toolCallEvent.data.params).toEqual({ verbose: true });
      expect(toolResultEvent.type).toBe('tool_result');
      expect(toolResultEvent.data.tool_call_id).toBe(toolCallEvent.data.tool_call_id);
      expect(toolResultEvent.data.results).toEqual([
        expect.objectContaining({ type: 'other', data: { from: 'now-15m', to: 'now' } }),
      ]);
    });

    it('emits an error result when the browser reported an error', async () => {
      const round = makeRound(browserToolPrompt('p1'));
      const promptState: PromptStorageState = {
        responses: {
          p1: {
            type: AgentPromptType.browser_tool_call,
            response: { error: 'Timed out after 30000ms.' },
          },
        },
      };

      await pendingBrowserToolPromptsToActions({
        round,
        promptState,
        attachmentStateManager,
        eventEmitter,
      });

      const toolResultEvent = eventEmitter.mock.calls[1][0];
      expect(toolResultEvent.data.results).toEqual([
        expect.objectContaining({ type: 'error', data: { message: 'Timed out after 30000ms.' } }),
      ]);
    });

    it('emits the substituted attachment reference for image results, not the base64 payload', async () => {
      const round = makeRound(browserToolPrompt('p1', 'capture_screenshot', 'image'));
      const promptState: PromptStorageState = {
        responses: {
          p1: {
            type: AgentPromptType.browser_tool_call,
            response: {
              result: JSON.stringify({
                content: BLUE_PIXEL_PNG,
                mime_type: 'image/png',
                image_attachment_key: 'screenshot:dash-1',
              }),
            },
          },
        },
      };

      await pendingBrowserToolPromptsToActions({
        round,
        promptState,
        attachmentStateManager,
        eventEmitter,
      });

      const toolResultEvent = eventEmitter.mock.calls[1][0];
      expect(toolResultEvent.data.results).toEqual([
        expect.objectContaining({
          type: 'other',
          data: { image_attachment_id: 'screenshot:dash-1' },
        }),
      ]);
      expect(JSON.stringify(toolResultEvent)).not.toContain('base64');
    });
  });

  describe('image results', () => {
    const imageResult = (extra: Record<string, unknown> = {}) =>
      JSON.stringify({
        content: BLUE_PIXEL_PNG,
        mime_type: 'image/png',
        filename: 'dashboard.png',
        ...extra,
      });

    const imagePromptState = (result: string): PromptStorageState => ({
      responses: {
        p1: { type: AgentPromptType.browser_tool_call, response: { result } },
      },
    });

    it('persists the image as a hidden attachment and substitutes the tool result content', async () => {
      const round = makeRound(browserToolPrompt('p1', 'capture_screenshot', 'image'));

      const result = await pendingBrowserToolPromptsToActions({
        round,
        promptState: imagePromptState(imageResult()),
        attachmentStateManager,
        eventEmitter,
      });

      expect(attachmentStateManager.add).toHaveBeenCalledWith({
        id: undefined,
        type: AttachmentType.image,
        data: { content: BLUE_PIXEL_PNG, mime_type: 'image/png', filename: 'dashboard.png' },
        hidden: true,
        description: "Image returned by browser tool 'capture_screenshot'",
      });

      const [, executeToolAction] = result.actions as any[];
      const content = JSON.parse(executeToolAction.tool_results[0].content);
      expect(content).toEqual({ image_attachment_id: 'generated-attachment-id' });
      expect(executeToolAction.tool_results[0].content).not.toContain('base64');
    });

    it('passes extra non-image fields through to the substituted content', async () => {
      const round = makeRound(browserToolPrompt('p1', 'capture_screenshot', 'image'));

      const result = await pendingBrowserToolPromptsToActions({
        round,
        promptState: imagePromptState(imageResult({ panel_count: 4 })),
        attachmentStateManager,
        eventEmitter,
      });

      const [, executeToolAction] = result.actions as any[];
      expect(JSON.parse(executeToolAction.tool_results[0].content)).toEqual({
        image_attachment_id: 'generated-attachment-id',
        panel_count: 4,
      });
    });

    it('creates the attachment under the stable key the tool supplied', async () => {
      const round = makeRound(browserToolPrompt('p1', 'capture_screenshot', 'image'));

      const result = await pendingBrowserToolPromptsToActions({
        round,
        promptState: imagePromptState(imageResult({ image_attachment_key: 'screenshot:dash-1' })),
        attachmentStateManager,
        eventEmitter,
      });

      expect(attachmentStateManager.add).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'screenshot:dash-1' })
      );
      const [, executeToolAction] = result.actions as any[];
      expect(JSON.parse(executeToolAction.tool_results[0].content)).toEqual({
        image_attachment_id: 'screenshot:dash-1',
      });
    });

    it('updates the existing attachment in place when the stable key already exists', async () => {
      attachmentStateManager.getAttachmentRecord.mockReturnValue({
        id: 'screenshot:dash-1',
        type: AttachmentType.image,
      } as any);
      const round = makeRound(browserToolPrompt('p1', 'capture_screenshot', 'image'));

      const result = await pendingBrowserToolPromptsToActions({
        round,
        promptState: imagePromptState(imageResult({ image_attachment_key: 'screenshot:dash-1' })),
        attachmentStateManager,
        eventEmitter,
      });

      expect(attachmentStateManager.add).not.toHaveBeenCalled();
      expect(attachmentStateManager.update).toHaveBeenCalledWith('screenshot:dash-1', {
        data: { content: BLUE_PIXEL_PNG, mime_type: 'image/png', filename: 'dashboard.png' },
      });
      const [, executeToolAction] = result.actions as any[];
      expect(JSON.parse(executeToolAction.tool_results[0].content)).toEqual({
        image_attachment_id: 'screenshot:dash-1',
      });
    });

    it('rejects a stable key that belongs to a non-image attachment', async () => {
      attachmentStateManager.getAttachmentRecord.mockReturnValue({
        id: 'screenshot:dash-1',
        type: AttachmentType.text,
      } as any);
      const round = makeRound(browserToolPrompt('p1', 'capture_screenshot', 'image'));

      const result = await pendingBrowserToolPromptsToActions({
        round,
        promptState: imagePromptState(imageResult({ image_attachment_key: 'screenshot:dash-1' })),
        attachmentStateManager,
        eventEmitter,
      });

      expect(attachmentStateManager.add).not.toHaveBeenCalled();
      expect(attachmentStateManager.update).not.toHaveBeenCalled();
      const [, executeToolAction] = result.actions as any[];
      expect(JSON.parse(executeToolAction.tool_results[0].content)).toEqual({
        error: expect.stringContaining('conflicts with an existing'),
      });
    });

    it('reports an error to the model when the result is not JSON', async () => {
      const round = makeRound(browserToolPrompt('p1', 'capture_screenshot', 'image'));

      const result = await pendingBrowserToolPromptsToActions({
        round,
        promptState: imagePromptState('not json'),
        attachmentStateManager,
        eventEmitter,
      });

      expect(attachmentStateManager.add).not.toHaveBeenCalled();
      const [, executeToolAction] = result.actions as any[];
      expect(JSON.parse(executeToolAction.tool_results[0].content)).toEqual({
        error: expect.stringContaining('non-JSON image result'),
      });
    });

    it('reports an error to the model when the payload is not a valid image', async () => {
      const round = makeRound(browserToolPrompt('p1', 'capture_screenshot', 'image'));

      const result = await pendingBrowserToolPromptsToActions({
        round,
        promptState: imagePromptState(
          JSON.stringify({ content: 'https://not-a-data-url', mime_type: 'image/png' })
        ),
        attachmentStateManager,
        eventEmitter,
      });

      expect(attachmentStateManager.add).not.toHaveBeenCalled();
      const [, executeToolAction] = result.actions as any[];
      expect(JSON.parse(executeToolAction.tool_results[0].content)).toEqual({
        error: expect.stringContaining('invalid image result'),
      });
    });

    it('reports an error to the model when persisting the attachment fails', async () => {
      (attachmentStateManager.add as jest.Mock).mockRejectedValue(new Error('validation failed'));
      const round = makeRound(browserToolPrompt('p1', 'capture_screenshot', 'image'));

      const result = await pendingBrowserToolPromptsToActions({
        round,
        promptState: imagePromptState(imageResult()),
        attachmentStateManager,
        eventEmitter,
      });

      const [, executeToolAction] = result.actions as any[];
      expect(JSON.parse(executeToolAction.tool_results[0].content)).toEqual({
        error: expect.stringContaining('validation failed'),
      });
    });

    it('hands json-typed results to the model verbatim even when they look like images', async () => {
      const round = makeRound(browserToolPrompt('p1', 'some_tool'));
      const raw = imageResult();

      const result = await pendingBrowserToolPromptsToActions({
        round,
        promptState: imagePromptState(raw),
        attachmentStateManager,
        eventEmitter,
      });

      expect(attachmentStateManager.add).not.toHaveBeenCalled();
      const [, executeToolAction] = result.actions as any[];
      expect(executeToolAction.tool_results[0].content).toBe(raw);
    });
  });
});
