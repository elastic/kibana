/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { KiVerifierRegistry } from './registry';
import { KiVerificationService } from './service';
import type { KiVerifier, KiVerifierContext, KiVerifierStatus } from './types';

const makeVerifier = (id: string, status: KiVerifierStatus): KiVerifier => ({
  id,
  verify: jest.fn().mockResolvedValue({ verifier: id, status, messages: [] }),
});

describe('KiVerificationService', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let context: KiVerifierContext;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    context = {
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      logger,
    };
  });

  const makeService = (verifiers: KiVerifier[]): KiVerificationService => {
    const registry = new KiVerifierRegistry();
    verifiers.forEach((verifier) => registry.register(verifier));
    return new KiVerificationService(registry);
  };

  it('returns valid when all verifiers pass', async () => {
    const service = makeService([makeVerifier('a', 'valid'), makeVerifier('b', 'valid')]);

    const summary = await service.verify({}, context);

    expect(summary.valid).toBe(true);
    expect(summary.results).toHaveLength(2);
  });

  it('returns invalid when any verifier fails', async () => {
    const service = makeService([makeVerifier('a', 'valid'), makeVerifier('b', 'invalid')]);

    const summary = await service.verify({}, context);

    expect(summary.valid).toBe(false);
  });

  it('does not count skipped verifiers against validity', async () => {
    const service = makeService([makeVerifier('a', 'skipped'), makeVerifier('b', 'valid')]);

    const summary = await service.verify({}, context);

    expect(summary.valid).toBe(true);
  });

  it('records a throwing verifier as invalid without throwing and logs a warning', async () => {
    const throwing: KiVerifier = {
      id: 'broken',
      verify: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const service = makeService([throwing, makeVerifier('a', 'valid')]);

    const summary = await service.verify({}, context);

    expect(summary.valid).toBe(false);
    expect(summary.results[0]).toEqual({
      verifier: 'broken',
      status: 'invalid',
      messages: ['boom'],
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('preserves registration order in results', async () => {
    const service = makeService([
      makeVerifier('first', 'valid'),
      makeVerifier('second', 'skipped'),
      makeVerifier('third', 'invalid'),
    ]);

    const summary = await service.verify({}, context);

    expect(summary.results.map(({ verifier }) => verifier)).toEqual(['first', 'second', 'third']);
  });
});
