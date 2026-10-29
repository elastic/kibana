/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationContext, Logger, ResolutionDetails } from '@openfeature/web-sdk';
import {
  ClientProviderEvents,
  OpenFeatureEventEmitter,
  StandardResolutionReasons,
} from '@openfeature/web-sdk';
import { SeededOfrepWebProvider } from './seeded_ofrep_provider';

const logger = {} as Logger;
const context: EvaluationContext = { targetingKey: 'user-1' };

const deferred = () => {
  let resolve: () => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const fakeInner = () => {
  const events = new OpenFeatureEventEmitter();
  const inner = {
    events,
    flagCache: {} as Record<string, { value?: unknown }>,
    initialize: jest.fn().mockResolvedValue(undefined),
    onContextChange: jest.fn().mockResolvedValue(undefined),
    onClose: jest.fn().mockResolvedValue(undefined),
    resolveBooleanEvaluation: jest.fn(
      (flagKey: string, defaultValue: boolean): ResolutionDetails<boolean> => ({
        value: (inner.flagCache[flagKey]?.value as boolean | undefined) ?? defaultValue,
        reason: StandardResolutionReasons.TARGETING_MATCH,
      })
    ),
    resolveStringEvaluation: jest.fn(),
    resolveNumberEvaluation: jest.fn(),
    resolveObjectEvaluation: jest.fn(),
  };
  return inner;
};

const providerFor = (initialFlags: Record<string, unknown>, inner: ReturnType<typeof fakeInner>) =>
  new SeededOfrepWebProvider({
    initialFlags,
    ofrep: { baseUrl: 'http://localhost:8220' },
    createProvider: () => inner,
  });

describe('SeededOfrepWebProvider', () => {
  test('serves injected flags before the web provider finishes fetching', async () => {
    const inner = fakeInner();
    const pending = deferred();
    inner.initialize.mockReturnValue(pending.promise);
    const provider = providerFor({ 'a.flag': true, 'b.flag': 'beta' }, inner);

    const initializing = provider.initialize(context);
    await initializing;

    expect(provider.resolveBooleanEvaluation('a.flag', false, context, logger)).toEqual({
      value: true,
      reason: StandardResolutionReasons.STATIC,
    });
    expect(provider.resolveStringEvaluation('b.flag', 'off', context, logger)).toEqual({
      value: 'beta',
      reason: StandardResolutionReasons.STATIC,
    });
    expect(
      provider.resolveBooleanEvaluation('missing.flag', false, context, logger).errorCode
    ).toBe('FLAG_NOT_FOUND');
    expect(provider.resolveNumberEvaluation('a.flag', 0, context, logger).errorCode).toBe(
      'TYPE_MISMATCH'
    );
    expect(inner.resolveBooleanEvaluation).not.toHaveBeenCalled();

    inner.flagCache = { 'a.flag': { value: false }, 'c.flag': { value: 3 } };
    pending.resolve();
    await pending.promise;
    await Promise.resolve();

    expect(provider.resolveBooleanEvaluation('a.flag', false, context, logger)).toEqual({
      value: false,
      reason: StandardResolutionReasons.TARGETING_MATCH,
    });
  });

  test('emits the flags whose fetched value differs from the injected one', async () => {
    const inner = fakeInner();
    inner.flagCache = { 'a.flag': { value: false }, 'b.flag': { value: 'beta' } };
    const provider = providerFor({ 'a.flag': true, 'b.flag': 'beta' }, inner);
    const changed = jest.fn();
    provider.events.addHandler(ClientProviderEvents.ConfigurationChanged, changed);

    await provider.initialize(context);

    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ flagsChanged: ['a.flag'] }));
  });

  test('keeps the injected flags when the first fetch fails', async () => {
    const inner = fakeInner();
    inner.initialize.mockRejectedValue(new Error('connection refused'));
    const warns: string[] = [];
    const provider = new SeededOfrepWebProvider({
      initialFlags: { 'a.flag': true },
      ofrep: { baseUrl: 'http://localhost:8220' },
      logger: { warn: (message) => warns.push(String(message)) },
      createProvider: () => inner,
    });

    await provider.initialize(context);
    await new Promise((resolve) => setImmediate(resolve));

    expect(provider.resolveBooleanEvaluation('a.flag', false, context, logger).value).toBe(true);
    expect(warns.join('\n')).toContain('connection refused');
  });

  test('waits for the web provider when nothing was injected', async () => {
    const inner = fakeInner();
    const pending = deferred();
    inner.initialize.mockReturnValue(pending.promise);
    inner.flagCache = { 'a.flag': { value: true } };
    const provider = providerFor({}, inner);

    let settled = false;
    const initializing = provider.initialize(context).then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    pending.resolve();
    await initializing;
    expect(provider.resolveBooleanEvaluation('a.flag', false, context, logger).value).toBe(true);
  });

  test('reports a later change against the fetched values, even when it matches the seed', async () => {
    const inner = fakeInner();
    inner.flagCache = { 'a.flag': { value: false } };
    const provider = providerFor({ 'a.flag': true }, inner);
    await provider.initialize(context);

    const changed = jest.fn();
    provider.events.addHandler(ClientProviderEvents.ConfigurationChanged, changed);
    inner.flagCache = { 'a.flag': { value: true } };
    await provider.onContextChange(context, { targetingKey: 'user-2' });

    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ flagsChanged: ['a.flag'] }));
  });

  test('forwards context changes and later configuration events once delegated', async () => {
    const inner = fakeInner();
    const provider = providerFor({ 'a.flag': true }, inner);
    await provider.initialize(context);

    const next = { targetingKey: 'user-2' };
    await provider.onContextChange(context, next);
    expect(inner.onContextChange).toHaveBeenCalledWith(context, next);

    const changed = jest.fn();
    provider.events.addHandler(ClientProviderEvents.ConfigurationChanged, changed);
    inner.events.emit(ClientProviderEvents.ConfigurationChanged, { flagsChanged: ['a.flag'] });
    expect(changed).toHaveBeenCalledWith({ flagsChanged: ['a.flag'] });
  });

  test('closes the web provider', async () => {
    const inner = fakeInner();
    const provider = providerFor({ 'a.flag': true }, inner);
    await provider.onClose();
    expect(inner.onClose).toHaveBeenCalled();
  });
});
