/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { KiVerifierRegistry } from './registry';
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

  it('passes when every applicable verifier passes', async () => {
    registry.register(makeVerifier('a', { passed: true }));
    registry.register(makeVerifier('b', { passed: true }));

    const summary = await service.verifyKi({}, context);

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

    const summary = await service.verifyKi({}, context);

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

    const summary = await service.verifyKi({}, context);

    expect(summary.passed).toBe(false);
  });

  it('runs only applicable verifiers', async () => {
    const applies = makeVerifier('applies', { passed: true }, true);
    const skips = makeVerifier('skips', { passed: false, reason: 'should not run' }, false);
    registry.register(applies);
    registry.register(skips);

    const summary = await service.verifyKi({}, context);

    expect(applies.verify).toHaveBeenCalledTimes(1);
    expect(skips.verify).not.toHaveBeenCalled();
    expect(summary.passed).toBe(true);
    expect(summary.results).toEqual([{ verifier: 'applies', passed: true }]);
  });

  it('records a throwing verifier as a failure, logs it, and continues the run', async () => {
    const thrower: KiVerifier = {
      id: 'thrower',
      applies: () => true,
      verify: jest.fn(async () => {
        throw new Error('boom');
      }),
    };
    const after = makeVerifier('after', { passed: true });
    registry.register(thrower);
    registry.register(after);

    const summary = await service.verifyKi({}, context);

    expect(after.verify).toHaveBeenCalledTimes(1);
    expect(summary.passed).toBe(false);
    expect(summary.results).toEqual([
      { verifier: 'thrower', passed: false, reason: 'boom' },
      { verifier: 'after', passed: true },
    ]);
    expect(context.logger.warn).toHaveBeenCalledWith("KI verifier 'thrower' threw: boom");
  });

  it('records a verifier whose applies() throws as a failure and continues the run', async () => {
    const thrower: KiVerifier = {
      id: 'applies-thrower',
      applies: () => {
        throw new Error('applies boom');
      },
      verify: jest.fn(async () => ({ passed: true as const })),
    };
    const after = makeVerifier('after', { passed: true });
    registry.register(thrower);
    registry.register(after);

    const summary = await service.verifyKi({}, context);

    expect(thrower.verify).not.toHaveBeenCalled();
    expect(after.verify).toHaveBeenCalledTimes(1);
    expect(summary.passed).toBe(false);
    expect(summary.results).toEqual([
      { verifier: 'applies-thrower', passed: false, reason: 'applies boom' },
      { verifier: 'after', passed: true },
    ]);
    expect(context.logger.warn).toHaveBeenCalledWith(
      "KI verifier 'applies-thrower' threw: applies boom"
    );
  });

  it('stamps the result with the verifier id from the registry', async () => {
    registry.register(makeVerifier('real-id', { passed: true }));

    const summary = await service.verifyKi({}, context);

    expect(summary.results).toEqual([{ verifier: 'real-id', passed: true }]);
  });

  it('passes with no results when no verifier applies', async () => {
    registry.register(makeVerifier('skips', { passed: false, reason: 'x' }, false));

    const summary = await service.verifyKi({}, context);

    expect(summary).toEqual({ passed: true, results: [] });
  });

  it('is a no-op that passes with no results when the feature flag is disabled', async () => {
    const verifier = makeVerifier('a', { passed: false, reason: 'x' });
    registry.register(verifier);

    const summary = await service.verifyKi({}, { ...context, isEnabled: false });

    expect(verifier.verify).not.toHaveBeenCalled();
    expect(summary).toEqual({ passed: true, results: [] });
  });
});
