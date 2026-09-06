/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { KiVerifierRegistry } from './registry';
import { KiVerificationInputError } from './errors';
import { KiVerificationService } from './service';
import type { KiVerificationContext, KiVerifier, KiVerifierOutcome } from './types';

const makeVerifier = (id: string, outcome: KiVerifierOutcome, applies = true): KiVerifier => ({
  id,
  applies: () => applies,
  verify: jest.fn(async () => outcome),
});

describe('KiVerificationService', () => {
  let registry: KiVerifierRegistry;
  let service: KiVerificationService;
  let context: KiVerificationContext;

  beforeEach(() => {
    registry = new KiVerifierRegistry();
    service = new KiVerificationService(registry);
    context = {
      isEnabled: true,
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      logger: loggingSystemMock.createLogger(),
    };
  });

  const run = (...verifierIds: string[]) =>
    service.verifyKi({}, { ...context, verifiers: verifierIds });

  it('throws when verifiers is not specified', async () => {
    await expect(service.verifyKi({}, context)).rejects.toEqual(
      expect.objectContaining({
        name: KiVerificationInputError.name,
        message: 'verifiers must list at least one verifier id',
      })
    );
  });

  it('throws before running any verifier when an id appears more than once', async () => {
    const first = makeVerifier('first', { passed: true });
    const duplicate = makeVerifier('duplicate', { passed: true });
    registry.register(first);
    registry.register(duplicate);

    await expect(run('first', 'duplicate', 'duplicate')).rejects.toEqual(
      expect.objectContaining({
        name: KiVerificationInputError.name,
        message: 'Duplicate verifier id: "duplicate"',
      })
    );
    expect(first.verify).not.toHaveBeenCalled();
    expect(duplicate.verify).not.toHaveBeenCalled();
  });

  it('passes when every applicable verifier passes', async () => {
    registry.register(makeVerifier('a', { passed: true }));
    registry.register(makeVerifier('b', { passed: true }));

    const summary = await run('a', 'b');

    expect(summary.passed).toBe(true);
    expect(summary.results).toEqual([
      { verifier: 'a', passed: true },
      { verifier: 'b', passed: true },
    ]);
  });

  it('runs all verifiers even after a failure, aggregating every reason (run-all, not first-fail)', async () => {
    const first = makeVerifier('first', { passed: false, reason: 'first failed' });
    const second = makeVerifier('second', { passed: false, reason: 'second failed' });
    registry.register(first);
    registry.register(second);

    const summary = await run('first', 'second');

    expect(second.verify).toHaveBeenCalledTimes(1);
    expect(summary.passed).toBe(false);
    expect(summary.results).toEqual([
      { verifier: 'first', passed: false, reason: 'first failed' },
      { verifier: 'second', passed: false, reason: 'second failed' },
    ]);
  });

  it('fails overall when any applicable verifier fails', async () => {
    registry.register(makeVerifier('pass', { passed: true }));
    registry.register(makeVerifier('fail', { passed: false, reason: 'nope' }));

    const summary = await run('pass', 'fail');

    expect(summary.passed).toBe(false);
  });

  it('runs only applicable verifiers', async () => {
    const applies = makeVerifier('applies', { passed: true }, true);
    const skips = makeVerifier('skips', { passed: false, reason: 'should not run' }, false);
    registry.register(applies);
    registry.register(skips);

    const summary = await run('applies', 'skips');

    expect(applies.verify).toHaveBeenCalledTimes(1);
    expect(skips.verify).not.toHaveBeenCalled();
    expect(summary.passed).toBe(true);
    expect(summary.results).toEqual([{ verifier: 'applies', passed: true }]);
  });

  it('propagates a verifier execution failure', async () => {
    const thrower: KiVerifier = {
      id: 'thrower',
      applies: () => true,
      verify: jest.fn(async () => {
        throw new Error('boom');
      }),
    };
    registry.register(thrower);

    await expect(run('thrower')).rejects.toThrow('boom');
    expect(context.logger.warn).toHaveBeenCalledWith("KI verifier 'thrower' threw: Error");
  });

  it('rethrows abort errors', async () => {
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    const aborter: KiVerifier = {
      id: 'aborter',
      applies: () => true,
      verify: jest.fn(async () => {
        throw abortError;
      }),
    };
    registry.register(aborter);

    await expect(run('aborter')).rejects.toThrow(abortError);
    expect(context.logger.warn).not.toHaveBeenCalled();
  });

  it('propagates a failure from applies()', async () => {
    const thrower: KiVerifier = {
      id: 'applies-thrower',
      applies: () => {
        throw new Error('applies boom');
      },
      verify: jest.fn(async () => ({ passed: true as const })),
    };
    registry.register(thrower);

    await expect(run('applies-thrower')).rejects.toThrow('applies boom');

    expect(thrower.verify).not.toHaveBeenCalled();
    expect(context.logger.warn).toHaveBeenCalledWith("KI verifier 'applies-thrower' threw: Error");
  });

  it('stamps the result with the verifier id from the registry', async () => {
    registry.register(makeVerifier('real-id', { passed: true }));

    const summary = await run('real-id');

    expect(summary.results).toEqual([{ verifier: 'real-id', passed: true }]);
  });

  it('passes with no results when no listed verifier applies', async () => {
    registry.register(makeVerifier('skips', { passed: false, reason: 'x' }, false));

    const summary = await run('skips');

    expect(summary).toEqual({ passed: true, results: [] });
  });

  it('throws before running any verifier when an unknown id is specified', async () => {
    const known = makeVerifier('known', { passed: true });
    registry.register(known);

    await expect(run('known', 'nonexistent')).rejects.toEqual(
      expect.objectContaining({
        name: KiVerificationInputError.name,
        message: 'Unknown verifier id: "nonexistent"',
      })
    );
    expect(known.verify).not.toHaveBeenCalled();
  });

  it('is a no-op that passes with no results when the feature flag is disabled', async () => {
    const verifier = makeVerifier('a', { passed: false, reason: 'x' });
    registry.register(verifier);

    const summary = await service.verifyKi({}, { ...context, isEnabled: false, verifiers: ['a'] });

    expect(verifier.verify).not.toHaveBeenCalled();
    expect(summary).toEqual({ passed: true, results: [] });
  });
});
