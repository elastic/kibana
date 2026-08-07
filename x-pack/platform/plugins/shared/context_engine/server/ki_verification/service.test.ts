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

  it('returns a valid verdict when all verifiers pass', async () => {
    const service = makeService([makeVerifier('a', 'valid'), makeVerifier('b', 'valid')]);

    const summary = await service.verify({}, context);

    expect(summary.verdict).toBe('valid');
    expect(summary.results).toHaveLength(2);
  });

  it('returns an invalid verdict when any verifier fails', async () => {
    const service = makeService([makeVerifier('a', 'valid'), makeVerifier('b', 'invalid')]);

    const summary = await service.verify({}, context);

    expect(summary.verdict).toBe('invalid');
  });

  it('does not count skipped verifiers against the verdict', async () => {
    const service = makeService([makeVerifier('a', 'skipped'), makeVerifier('b', 'valid')]);

    const summary = await service.verify({}, context);

    expect(summary.verdict).toBe('valid');
  });

  it('returns an indeterminate verdict when a verifier errors and none report invalid', async () => {
    const service = makeService([makeVerifier('a', 'valid'), makeVerifier('b', 'error')]);

    const summary = await service.verify({}, context);

    expect(summary.verdict).toBe('indeterminate');
  });

  it('reports invalid over indeterminate when both occur', async () => {
    const service = makeService([makeVerifier('a', 'error'), makeVerifier('b', 'invalid')]);

    const summary = await service.verify({}, context);

    expect(summary.verdict).toBe('invalid');
  });

  it('records a throwing verifier as error without throwing and logs a warning', async () => {
    const throwing: KiVerifier = {
      id: 'broken',
      verify: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const service = makeService([throwing, makeVerifier('a', 'valid')]);

    const summary = await service.verify({}, context);

    expect(summary.verdict).toBe('indeterminate');
    expect(summary.results[0]).toEqual({
      verifier: 'broken',
      status: 'error',
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
