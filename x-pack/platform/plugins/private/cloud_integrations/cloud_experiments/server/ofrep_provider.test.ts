/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@openfeature/server-sdk';
import {
  ErrorCode,
  ServerProviderEvents,
  StandardResolutionReasons,
} from '@openfeature/server-sdk';
import { CachedOfrepProvider } from './ofrep_provider';

const logger = { error() {}, warn() {}, info() {}, debug() {} } as Logger;

const response = (flags: unknown[]) => ({
  ok: true,
  status: 200,
  json: async () => ({ flags }),
});

describe('CachedOfrepProvider', () => {
  const fetchImpl = jest.fn();

  beforeEach(() => {
    fetchImpl.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createProvider = (pollIntervalMs = 30_000) =>
    new CachedOfrepProvider({
      baseUrl: 'http://localhost:8220',
      sdkKey: 'ffsdk-secret',
      pollIntervalMs,
      fetchImpl,
    });

  test('resolves later evaluations from the bulk response', async () => {
    fetchImpl.mockResolvedValue(response([{ key: 'a.flag', value: true }]));
    const provider = createProvider();
    await provider.initialize({ targetingKey: 'kibana' });

    await expect(
      provider.resolveBooleanEvaluation('a.flag', false, { targetingKey: 'kibana' }, logger)
    ).resolves.toEqual({ value: true, reason: StandardResolutionReasons.CACHED });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await provider.onClose();
  });

  test('returns the default when the flag is missing or the type does not match', async () => {
    fetchImpl.mockResolvedValue(response([{ key: 'a.flag', value: 'on' }]));
    const provider = createProvider();
    await provider.initialize({});

    await expect(
      provider.resolveBooleanEvaluation('missing', false, {}, logger)
    ).resolves.toMatchObject({
      value: false,
      errorCode: ErrorCode.FLAG_NOT_FOUND,
    });
    await expect(
      provider.resolveBooleanEvaluation('a.flag', false, {}, logger)
    ).resolves.toMatchObject({
      value: false,
      errorCode: ErrorCode.TYPE_MISMATCH,
    });

    await provider.onClose();
  });

  test('emits a configuration change for flags whose value changed', async () => {
    fetchImpl
      .mockResolvedValueOnce(
        response([
          { key: 'a.flag', value: true },
          { key: 'b.flag', value: 1 },
        ])
      )
      .mockResolvedValueOnce(
        response([
          { key: 'a.flag', value: false },
          { key: 'b.flag', value: 1 },
          { key: 'c.flag', value: 'new' },
        ])
      );
    const provider = createProvider();
    const onChange = jest.fn();
    provider.events.addHandler(ServerProviderEvents.ConfigurationChanged, onChange);
    await provider.initialize({});
    onChange.mockClear();

    await jest.advanceTimersByTimeAsync(30_000);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ flagsChanged: ['a.flag', 'c.flag'] })
    );
    await expect(
      provider.resolveBooleanEvaluation('a.flag', true, {}, logger)
    ).resolves.toMatchObject({
      value: false,
    });

    await provider.onClose();
  });

  test('re-evaluates when the context changes', async () => {
    fetchImpl
      .mockResolvedValueOnce(response([{ key: 'a.flag', value: false }]))
      .mockResolvedValueOnce(response([{ key: 'a.flag', value: true }]));
    const provider = createProvider();
    await provider.initialize({ targetingKey: 'one' });

    await expect(
      provider.resolveBooleanEvaluation('a.flag', false, { targetingKey: 'two' }, logger)
    ).resolves.toMatchObject({ value: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchImpl.mock.calls[1][1].body as string);
    expect(secondBody.context).toEqual({ targetingKey: 'two' });

    await provider.onClose();
  });

  test('keeps the last values when a poll fails, then recovers', async () => {
    fetchImpl
      .mockResolvedValueOnce(response([{ key: 'a.flag', value: true }]))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response([{ key: 'a.flag', value: false }]));
    const provider = createProvider();
    await provider.initialize({});

    await jest.advanceTimersByTimeAsync(30_000);
    await expect(provider.resolveBooleanEvaluation('a.flag', false, {}, logger)).resolves.toEqual({
      value: true,
      reason: StandardResolutionReasons.STALE,
    });

    await jest.advanceTimersByTimeAsync(30_000);
    await expect(
      provider.resolveBooleanEvaluation('a.flag', true, {}, logger)
    ).resolves.toMatchObject({
      value: false,
      reason: StandardResolutionReasons.CACHED,
    });

    await provider.onClose();
  });

  test('starts polling after the first evaluation fails', async () => {
    fetchImpl
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response([{ key: 'a.flag', value: true }]));
    const provider = createProvider();
    await provider.initialize({});

    await expect(
      provider.resolveBooleanEvaluation('a.flag', false, {}, logger)
    ).resolves.toMatchObject({ errorCode: ErrorCode.FLAG_NOT_FOUND });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(30_000);
    await expect(
      provider.resolveBooleanEvaluation('a.flag', false, {}, logger)
    ).resolves.toMatchObject({
      value: true,
    });

    await provider.onClose();
  });

  test('stops polling when closed', async () => {
    fetchImpl.mockResolvedValue(response([]));
    const provider = createProvider();
    await provider.initialize({});
    await provider.onClose();

    await jest.advanceTimersByTimeAsync(60_000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('getBulkFlagValues returns the cache and evaluates only when it is missing', async () => {
    fetchImpl.mockResolvedValue(
      response([
        { key: 'a.flag', value: true, reason: 'STATIC' },
        { key: 'b.flag', errorCode: 'FLAG_NOT_FOUND' },
      ])
    );
    const provider = createProvider(0);
    await provider.initialize({ targetingKey: 'kibana' });

    await expect(provider.getBulkFlagValues({ targetingKey: 'kibana' })).resolves.toEqual({
      'a.flag': true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL('http://localhost:8220/ofrep/v1/evaluate/flags'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer ffsdk-secret' }),
      })
    );

    fetchImpl.mockResolvedValueOnce(response([{ key: 'a.flag', value: false }]));
    await expect(provider.getBulkFlagValues({ targetingKey: 'other' })).resolves.toEqual({
      'a.flag': false,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    await provider.onClose();
  });

  test('getBulkFlagValues populates the cache before initialize', async () => {
    fetchImpl.mockResolvedValue(response([{ key: 'a.flag', value: 2 }]));
    const provider = createProvider(0);

    await expect(provider.getBulkFlagValues({ targetingKey: 'kibana' })).resolves.toEqual({
      'a.flag': 2,
    });
    await expect(
      provider.resolveNumberEvaluation('a.flag', 0, { targetingKey: 'kibana' }, logger)
    ).resolves.toMatchObject({ value: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await provider.onClose();
  });

  test('getBulkFlagValues returns no flags when the endpoint fails for a new context', async () => {
    fetchImpl.mockResolvedValueOnce(response([{ key: 'a.flag', value: true }]));
    const provider = createProvider(0);
    await provider.initialize({});
    fetchImpl.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

    await expect(provider.getBulkFlagValues({ targetingKey: 'other' })).resolves.toEqual({});

    await provider.onClose();
  });
});
