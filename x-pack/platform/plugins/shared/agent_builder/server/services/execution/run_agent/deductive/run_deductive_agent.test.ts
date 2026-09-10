/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAgentHandlerContextMock } from '../../../../test_utils/runner';
import { shouldUseDeductive } from './config';
import * as deductiveClient from './deductive_client';
import { DeductiveSessionUnavailableError, DeductiveError } from './deductive_client';
import { runDeductiveAgent } from './run_deductive_agent';

jest.mock('./deductive_client', () => {
  const actual = jest.requireActual('./deductive_client');
  return {
    ...actual,
    createDeductiveSession: jest.fn(),
    sendDeductiveMessageAndReadSse: jest.fn(),
    refreshDeductiveToken: jest.fn(),
  };
});

const clientMock = deductiveClient as jest.Mocked<typeof deductiveClient>;

const baseParams = (conversation?: any): any => ({
  agentId: 'deductive.ai',
  agentConfiguration: { instructions: 'be helpful' },
  nextInput: { message: 'hello deductive' },
  configurationOverrides: undefined,
  conversation,
});

const context = (deductiveOverride?: any): any => {
  const ctx = createAgentHandlerContextMock() as any;
  ctx.conversationClient.update = jest.fn().mockResolvedValue({});
  // default: a passing runner-resolved config (flag + setting + key all present)
  ctx.deductive = {
    enabled: true,
    endpoint: 'https://app.deductive.ai',
    apiKey: 'dak_ctx',
    ...(deductiveOverride ?? {}),
  };
  return ctx;
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.DEDUCTIVE_API_KEY = 'dak_test-token';
  clientMock.createDeductiveSession.mockResolvedValue({
    sessionId: 'sess-1',
    url: 'https://threads/sess-1',
  });
  clientMock.sendDeductiveMessageAndReadSse.mockResolvedValue({
    answer: 'the answer',
    timeToFirstTokenMs: 150,
  });
  clientMock.refreshDeductiveToken.mockResolvedValue({
    token: 'dak_refreshed',
    refreshToken: 'refreshed-rt',
  });
});

afterEach(() => {
  delete process.env.DEDUCTIVE_API_KEY;
});

describe('shouldUseDeductive', () => {
  it('routes the default deductive agent id', () => {
    expect(shouldUseDeductive('deductive.ai')).toBe(true);
  });

  it('does not route other agents', () => {
    expect(shouldUseDeductive('default-agent')).toBe(false);
    expect(shouldUseDeductive(undefined)).toBe(false);
  });
});

describe('runDeductiveAgent', () => {
  it('creates a session on turn 1, persists session id, emits events, and returns a round', async () => {
    const ctx = context();
    const result = await runDeductiveAgent(baseParams({ id: 'conv-1' }), ctx);

    // session created because no metadata was present
    expect(clientMock.createDeductiveSession).toHaveBeenCalledWith({
      endpoint: 'https://app.deductive.ai',
      token: 'dak_ctx',
      teamId: undefined,
    });

    // the message was sent to the created session
    expect(clientMock.sendDeductiveMessageAndReadSse).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'sess-1' })
    );

    // session id persisted
    expect(ctx.conversationClient.update).toHaveBeenCalledWith(
      { id: 'conv-1', metadata: { deductive_session_id: 'sess-1' } },
      { access: 'owner', retryOnConflict: true }
    );

    // events emitted: roundStarted -> messageComplete -> roundComplete (snake_case values)
    const emitted = ctx.events.emit.mock.calls.map((c: any) => c[0].type as string);
    expect(emitted.filter((t: any) => t === 'round_started')).toHaveLength(1);
    expect(emitted).toContain('message_complete');
    expect(emitted).toContain('round_complete');

    // returned round carries the answer
    expect(result.round.status).toBe('completed');
    expect(result.round.response.message).toBe('the answer');
    expect(result.round.model_usage.connector_id).toBe('deductive');
  });

  it('does not persist metadata when there is no conversation id', async () => {
    const ctx = context();
    await runDeductiveAgent(baseParams(), ctx);

    expect(ctx.conversationClient.update).not.toHaveBeenCalled();
  });

  it('reuses the persisted session on turn 2 (multi-turn)', async () => {
    const ctx = context();
    const params = baseParams({
      id: 'conv-1',
      metadata: { deductive_session_id: 'sess-existing' },
    });

    await runDeductiveAgent(params, ctx);

    expect(clientMock.createDeductiveSession).not.toHaveBeenCalled();
    expect(clientMock.sendDeductiveMessageAndReadSse).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'sess-existing' })
    );
  });

  it('recovers from an expired session by minting a fresh one and retrying', async () => {
    const ctx = context();
    const params = baseParams({
      id: 'conv-1',
      metadata: { deductive_session_id: 'gone' },
    });

    clientMock.sendDeductiveMessageAndReadSse
      .mockRejectedValueOnce(new DeductiveSessionUnavailableError(410))
      .mockResolvedValueOnce({ answer: 'fresh answer', timeToFirstTokenMs: 50 });

    const result = await runDeductiveAgent(params, ctx);

    expect(clientMock.createDeductiveSession).toHaveBeenCalledTimes(1);
    expect(clientMock.sendDeductiveMessageAndReadSse).toHaveBeenCalledTimes(2);
    expect(clientMock.sendDeductiveMessageAndReadSse).toHaveBeenLastCalledWith(
      expect.objectContaining({ sessionId: 'sess-1' })
    );
    expect(result.round.response.message).toBe('fresh answer');
    // persisted session id should now point at the fresh session
    expect(ctx.conversationClient.update).toHaveBeenCalledWith(
      { id: 'conv-1', metadata: { deductive_session_id: 'sess-1' } },
      { access: 'owner', retryOnConflict: true }
    );
  });

  it('fails when both settings and env are absent', async () => {
    delete process.env.DEDUCTIVE_API_KEY;
    const ctx = context({ enabled: true, endpoint: 'https://app.deductive.ai', apiKey: '' }); // no apiKey

    await expect(runDeductiveAgent(baseParams(), ctx)).rejects.toThrow(
      'Deductive AI execution is disabled'
    );
  });

  it.each([
    ['feature flag off', { enabled: false, endpoint: 'https://app.deductive.ai', apiKey: 'k' }],
    ['advanced setting off (no context)', undefined],
  ])('kill-switch %s: rejects before any Deductive call', async (_name, dedCtx) => {
    const ctx = context();
    // an available cache (or stale context) must not permit a run when the gate is off
    ctx.deductive = dedCtx;
    process.env.DEDUCTIVE_API_KEY = 'dak_present';
    // prime the availability cache as if enabled, then the gate is off
    await expect(runDeductiveAgent(baseParams({ id: 'conv-1' }), ctx)).rejects.toThrow(
      'Deductive AI execution is disabled'
    );
    expect(clientMock.createDeductiveSession).not.toHaveBeenCalled();
    expect(clientMock.sendDeductiveMessageAndReadSse).not.toHaveBeenCalled();
  });

  it('emits text chunks as the answer streams', async () => {
    const ctx = context();
    clientMock.sendDeductiveMessageAndReadSse.mockImplementation(async (opts) => {
      opts.callbacks?.onAnswerChunk?.('chunk one');
      opts.callbacks?.onAnswerChunk?.(' chunk two');
      return { answer: 'chunk one chunk two', timeToFirstTokenMs: 10 };
    });

    await runDeductiveAgent(baseParams({ id: 'conv-1' }), ctx);

    const types = ctx.events.emit.mock.calls.map((c: any) => c[0].type as string);
    expect(types.filter((t: any) => t === 'message_chunk')).toHaveLength(2);
  });

  it('persistent 401 after refresh is bounded (no infinite loop)', async () => {
    const ctx = context();
    // flag on but no settings configured => env fallback carries the refresh token
    ctx.deductive = { enabled: true };
    process.env.DEDUCTIVE_REFRESH_TOKEN = 'env-refresh';
    // 401 every time, even after a successful refresh
    clientMock.sendDeductiveMessageAndReadSse.mockRejectedValue(new DeductiveError('401', 401));

    await expect(runDeductiveAgent(baseParams({ id: 'conv-1' }), ctx)).rejects.toThrow('401');
    // one refresh attempt only, then the loop exits
    expect(clientMock.refreshDeductiveToken).toHaveBeenCalledTimes(1);
    expect(clientMock.sendDeductiveMessageAndReadSse).toHaveBeenCalledTimes(2);

    delete process.env.DEDUCTIVE_REFRESH_TOKEN;
  });

  it('propagates errors from the client', async () => {
    const ctx = context();
    clientMock.sendDeductiveMessageAndReadSse.mockRejectedValue(
      new DeductiveSessionUnavailableError(404)
    );

    await expect(runDeductiveAgent(baseParams(), ctx)).rejects.toThrow('session not found');
  });
});
