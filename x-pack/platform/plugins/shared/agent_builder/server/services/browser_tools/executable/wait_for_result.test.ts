/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { BrowserToolCallStatus } from '@kbn/agent-builder-common';
import type { BrowserToolResultPayload } from '@kbn/agent-builder-common';
import type {
  BrowserToolCallClientContract,
  BrowserToolCallRecord,
} from '@kbn/agent-builder-server/runner';
import { waitForBrowserToolResult } from './wait_for_result';
import type { WaitOutcome } from './wait_for_result';

const POLL_MS = 100;

const createCallClientMock = (): jest.Mocked<BrowserToolCallClientContract> => ({
  create: jest.fn(),
  get: jest.fn(),
  answer: jest.fn(),
  setStatus: jest.fn(),
});

const record = (
  toolCallId: string,
  status: BrowserToolCallStatus,
  result?: BrowserToolResultPayload
): BrowserToolCallRecord => ({
  execution_id: 'exec-1',
  tool_call_id: toolCallId,
  space_id: 'default',
  tool_id: 'browser.tool',
  status,
  created_at: new Date().toISOString(),
  expires_at: new Date().toISOString(),
  result,
});

/** Tracks a promise's settlement without awaiting it, so fake timers can drive it. */
const track = (promise: Promise<WaitOutcome>) => {
  const state: { outcome?: WaitOutcome } = {};
  promise.then((outcome) => {
    state.outcome = outcome;
  });
  return state;
};

describe('waitForBrowserToolResult', () => {
  let callClient: jest.Mocked<BrowserToolCallClientContract>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-03T10:00:00.000Z'));
    callClient = createCallClientMock();
    logger = loggerMock.create();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const expiresIn = (ms: number) => new Date(Date.now() + ms);

  it('resolves answered when the document becomes answered', async () => {
    const result: BrowserToolResultPayload = { status: 'ok', content: 'hello' };
    let answered = false;
    callClient.get.mockImplementation(async (_, toolCallId) =>
      answered
        ? record(toolCallId, BrowserToolCallStatus.answered, result)
        : record(toolCallId, BrowserToolCallStatus.pending)
    );

    const state = track(
      waitForBrowserToolResult({
        callClient,
        logger,
        executionId: 'exec-1',
        toolCallId: 'call-1',
        expiresAt: expiresIn(10_000),
        pollIntervalMs: POLL_MS,
      })
    );

    await jest.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(state.outcome).toBeUndefined();

    answered = true;
    await jest.advanceTimersByTimeAsync(POLL_MS);

    expect(state.outcome).toEqual({ type: 'answered', result });
    expect(callClient.get).toHaveBeenCalledWith('exec-1', 'call-1');
  });

  it('resolves timeout when expiresAt passes without an answer', async () => {
    callClient.get.mockImplementation(async (_, toolCallId) =>
      record(toolCallId, BrowserToolCallStatus.pending)
    );

    const state = track(
      waitForBrowserToolResult({
        callClient,
        logger,
        executionId: 'exec-1',
        toolCallId: 'call-1',
        expiresAt: expiresIn(1_000),
        pollIntervalMs: POLL_MS,
      })
    );

    await jest.advanceTimersByTimeAsync(900);
    expect(state.outcome).toBeUndefined();

    await jest.advanceTimersByTimeAsync(200);
    expect(state.outcome).toEqual({ type: 'timeout' });
  });

  it('keeps polling after a transient get error', async () => {
    const result: BrowserToolResultPayload = { status: 'ok' };
    callClient.get
      .mockRejectedValueOnce(new Error('es unavailable'))
      .mockImplementation(async (_, toolCallId) =>
        record(toolCallId, BrowserToolCallStatus.answered, result)
      );

    const state = track(
      waitForBrowserToolResult({
        callClient,
        logger,
        executionId: 'exec-1',
        toolCallId: 'call-1',
        expiresAt: expiresIn(10_000),
        pollIntervalMs: POLL_MS,
      })
    );

    await jest.advanceTimersByTimeAsync(POLL_MS);

    expect(state.outcome).toEqual({ type: 'answered', result });
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('resolves aborted when the signal fires', async () => {
    callClient.get.mockImplementation(async (_, toolCallId) =>
      record(toolCallId, BrowserToolCallStatus.pending)
    );
    const controller = new AbortController();

    const state = track(
      waitForBrowserToolResult({
        callClient,
        logger,
        executionId: 'exec-1',
        toolCallId: 'call-1',
        expiresAt: expiresIn(10_000),
        abortSignal: controller.signal,
        pollIntervalMs: POLL_MS,
      })
    );

    await jest.advanceTimersByTimeAsync(POLL_MS * 2 + POLL_MS / 2);
    expect(state.outcome).toBeUndefined();

    controller.abort();
    // resolves without waiting for the next poll tick
    await jest.advanceTimersByTimeAsync(0);

    expect(state.outcome).toEqual({ type: 'aborted' });
  });

  it('resolves aborted immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const outcome = await waitForBrowserToolResult({
      callClient,
      logger,
      executionId: 'exec-1',
      toolCallId: 'call-1',
      expiresAt: expiresIn(10_000),
      abortSignal: controller.signal,
      pollIntervalMs: POLL_MS,
    });

    expect(outcome).toEqual({ type: 'aborted' });
    expect(callClient.get).not.toHaveBeenCalled();
  });

  it('two concurrent waits resolve independently', async () => {
    const answeredIds = new Set<string>();
    const resultFor = (toolCallId: string): BrowserToolResultPayload => ({
      status: 'ok',
      content: toolCallId,
    });
    callClient.get.mockImplementation(async (_, toolCallId) =>
      answeredIds.has(toolCallId)
        ? record(toolCallId, BrowserToolCallStatus.answered, resultFor(toolCallId))
        : record(toolCallId, BrowserToolCallStatus.pending)
    );

    const wait = (toolCallId: string) =>
      track(
        waitForBrowserToolResult({
          callClient,
          logger,
          executionId: 'exec-1',
          toolCallId,
          expiresAt: expiresIn(10_000),
          pollIntervalMs: POLL_MS,
        })
      );

    const first = wait('call-1');
    const second = wait('call-2');

    await jest.advanceTimersByTimeAsync(POLL_MS);
    answeredIds.add('call-2');
    await jest.advanceTimersByTimeAsync(POLL_MS);

    expect(second.outcome).toEqual({ type: 'answered', result: resultFor('call-2') });
    expect(first.outcome).toBeUndefined();

    answeredIds.add('call-1');
    await jest.advanceTimersByTimeAsync(POLL_MS);

    expect(first.outcome).toEqual({ type: 'answered', result: resultFor('call-1') });
  });
});
