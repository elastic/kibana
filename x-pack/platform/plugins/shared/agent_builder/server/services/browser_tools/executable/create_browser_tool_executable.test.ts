/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  BrowserToolCallStatus,
  ToolOrigin,
  ToolResultType,
  ToolType,
} from '@kbn/agent-builder-common';
import type { BrowserToolDescriptor, BrowserToolResultPayload } from '@kbn/agent-builder-common';
import type { BrowserToolCallRecord, RunToolReturn } from '@kbn/agent-builder-server/runner';
import type { ToolHandlerReturn } from '@kbn/agent-builder-server';
import {
  createBrowserToolsServiceMock,
  createScopedRunnerMock,
  createToolHandlerContextMock,
} from '../../../test_utils/runner';
import type { ToolHandlerContextMock } from '../../../test_utils/runner';
import type { BrowserToolsService } from '../browser_tools_service';
import { createBrowserToolExecutable } from './create_browser_tool_executable';

const POLL_MS = 200;
const NOW = new Date('2026-11-03T10:00:00.000Z');

const descriptor: BrowserToolDescriptor = {
  id: 'browser.read_page',
  description: 'Read the current page',
  schema: {
    type: 'object',
    properties: { selector: { type: 'string' } },
    required: ['selector'],
  },
  timeout_ms: 5_000,
};

const record = (
  status: BrowserToolCallStatus,
  result?: BrowserToolResultPayload
): BrowserToolCallRecord => ({
  execution_id: 'exec-1',
  tool_call_id: 'call-1',
  space_id: 'default',
  tool_id: descriptor.id,
  status,
  created_at: NOW.toISOString(),
  expires_at: NOW.toISOString(),
  result,
});

describe('createBrowserToolExecutable', () => {
  let browserTools: BrowserToolsService;
  let runner: ReturnType<typeof createScopedRunnerMock>;
  let handlerContext: ToolHandlerContextMock;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    browserTools = createBrowserToolsServiceMock();
    (browserTools.callClient.create as jest.Mock).mockResolvedValue(undefined);
    (browserTools.callClient.setStatus as jest.Mock).mockResolvedValue(undefined);
    logger = loggerMock.create();

    handlerContext = createToolHandlerContextMock();
    handlerContext.callContext = {
      toolId: descriptor.id,
      toolCallId: 'call-1',
      callSource: 'agent',
    };

    // run the internal tool's handler against a mocked handler context, as the runner does
    runner = createScopedRunnerMock();
    runner.runInternalTool.mockImplementation(async ({ tool, toolParams }) => {
      const handler = await tool.getHandler();
      const output = (await handler(toolParams, handlerContext)) as ToolHandlerReturn;
      return output as RunToolReturn;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createExecutable = () =>
    createBrowserToolExecutable({
      descriptor,
      clientId: 'client-1',
      executionId: 'exec-1',
      spaceId: 'default',
      browserTools,
      runner,
      logger,
    });

  it('exposes the descriptor as an internal builtin tool marked as browser', async () => {
    const executable = createExecutable();

    expect(executable).toEqual(
      expect.objectContaining({
        id: descriptor.id,
        type: ToolType.builtin,
        origin: ToolOrigin.internal,
        description: descriptor.description,
        browser: true,
      })
    );

    const schema = await executable.getSchema();
    expect(schema.safeParse({ selector: '#main' }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('creates a pending document, emits browser_tool_call with client_id and expires_at, and returns the normalised result', async () => {
    const expiresAt = new Date(NOW.getTime() + 5_000).toISOString();
    let answered = false;
    (browserTools.callClient.get as jest.Mock).mockImplementation(async () =>
      answered
        ? record(BrowserToolCallStatus.answered, { status: 'ok', content: 'the page text' })
        : record(BrowserToolCallStatus.pending)
    );

    const executable = createExecutable();
    let output: RunToolReturn | undefined;
    executable
      .execute({ toolParams: { selector: '#main' }, toolCallId: 'call-1' })
      .then((value) => {
        output = value;
      });

    await jest.advanceTimersByTimeAsync(0);

    expect(browserTools.callClient.create).toHaveBeenCalledWith({
      executionId: 'exec-1',
      toolCallId: 'call-1',
      clientId: 'client-1',
      spaceId: 'default',
      toolId: descriptor.id,
      expiresAt,
    });
    expect(handlerContext.events.emitBrowserToolCall).toHaveBeenCalledWith({
      params: { selector: '#main' },
      clientId: 'client-1',
      expiresAt,
    });
    expect(output).toBeUndefined();

    answered = true;
    await jest.advanceTimersByTimeAsync(POLL_MS);

    expect(output).toEqual({
      results: [
        {
          tool_result_id: expect.any(String),
          type: ToolResultType.other,
          data: { content: 'the page text' },
        },
      ],
    });
    expect(browserTools.callClient.setStatus).toHaveBeenCalledWith(
      'exec-1',
      'call-1',
      BrowserToolCallStatus.consumed
    );
  });

  it('uploads answered images through the run context', async () => {
    const image = { mime_type: 'image/png' as const, base64: 'AAA', name: 'shot' };
    const imageResult = {
      tool_result_id: 'image-result',
      type: ToolResultType.image as const,
      data: {
        attachment_id: 'attachment-1',
        mime_type: 'image/png',
        name: 'shot',
        description: `Screenshot taken by ${descriptor.id}.`,
      },
    };
    (browserTools.uploadImage as jest.Mock).mockResolvedValue(imageResult);
    (browserTools.callClient.get as jest.Mock).mockResolvedValue(
      record(BrowserToolCallStatus.answered, { status: 'ok', images: [image] })
    );

    const promise = createExecutable().execute({ toolParams: { selector: '#main' } });
    await jest.advanceTimersByTimeAsync(0);

    await expect(promise).resolves.toEqual({ results: [imageResult] });
    expect(browserTools.uploadImage).toHaveBeenCalledWith({
      image,
      request: handlerContext.request,
      attachments: handlerContext.attachments,
      toolId: descriptor.id,
    });
  });

  it('marks the call expired and returns an error result on timeout', async () => {
    (browserTools.callClient.get as jest.Mock).mockResolvedValue(
      record(BrowserToolCallStatus.pending)
    );

    let output: RunToolReturn | undefined;
    createExecutable()
      .execute({ toolParams: { selector: '#main' } })
      .then((value) => {
        output = value;
      });

    await jest.advanceTimersByTimeAsync(4_800);
    expect(output).toBeUndefined();

    await jest.advanceTimersByTimeAsync(400);

    expect(output).toEqual({
      results: [
        expect.objectContaining({
          type: ToolResultType.error,
          data: { message: 'Browser did not answer within 5 s' },
        }),
      ],
    });
    expect(browserTools.callClient.setStatus).toHaveBeenCalledWith(
      'exec-1',
      'call-1',
      BrowserToolCallStatus.expired
    );
  });

  it('marks the call expired and returns an error result when the execution is aborted', async () => {
    (browserTools.callClient.get as jest.Mock).mockResolvedValue(
      record(BrowserToolCallStatus.pending)
    );
    const controller = new AbortController();
    handlerContext.abortSignal = controller.signal;

    const promise = createExecutable().execute({ toolParams: { selector: '#main' } });
    await jest.advanceTimersByTimeAsync(POLL_MS);
    controller.abort();

    await expect(promise).resolves.toEqual({
      results: [
        expect.objectContaining({
          type: ToolResultType.error,
          data: { message: 'Execution aborted while waiting for the browser' },
        }),
      ],
    });
    expect(browserTools.callClient.setStatus).toHaveBeenCalledWith(
      'exec-1',
      'call-1',
      BrowserToolCallStatus.expired
    );
  });

  it('returns an error result instead of throwing when the call cannot be created', async () => {
    (browserTools.callClient.create as jest.Mock).mockRejectedValue(new Error('index missing'));

    const output = await createExecutable().execute({ toolParams: { selector: '#main' } });

    expect(output).toEqual({
      results: [
        expect.objectContaining({
          type: ToolResultType.error,
          data: { message: expect.stringContaining('index missing') },
        }),
      ],
    });
    expect(handlerContext.events.emitBrowserToolCall).not.toHaveBeenCalled();
  });

  it('does not fail the call when marking it consumed fails', async () => {
    (browserTools.callClient.setStatus as jest.Mock).mockRejectedValue(new Error('conflict'));
    (browserTools.callClient.get as jest.Mock).mockResolvedValue(
      record(BrowserToolCallStatus.answered, { status: 'ok' })
    );

    const promise = createExecutable().execute({ toolParams: { selector: '#main' } });
    await jest.advanceTimersByTimeAsync(0);

    await expect(promise).resolves.toEqual({
      results: [expect.objectContaining({ type: ToolResultType.other, data: { status: 'done' } })],
    });
    expect(logger.warn).toHaveBeenCalled();
  });
});
