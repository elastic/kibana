/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CodeHit, ServiceNameCandidate } from './types';
import {
  collectServiceNameCandidatesFromCode,
  normalizeServiceName,
  rankServiceName,
  resolveServiceName,
} from './resolve_service_name';

const candidate = (overrides: Partial<ServiceNameCandidate>): ServiceNameCandidate => ({
  value: 'checkout',
  signal: 'manifest',
  source: 'app',
  evidence: 'code: acme/checkout:pkg.json name',
  ...overrides,
});

describe('normalizeServiceName', () => {
  it('collapses separators and strips a trailing service suffix', () => {
    expect(normalizeServiceName('checkout-service')).toBe('checkout');
    expect(normalizeServiceName('checkout_service')).toBe('checkout');
    expect(normalizeServiceName('CheckoutService')).toBe('checkout');
    expect(normalizeServiceName('Checkout')).toBe('checkout');
  });
});

describe('rankServiceName', () => {
  it('returns undefined when there are no candidates', () => {
    expect(rankServiceName([], ['anything'])).toBeUndefined();
  });

  it('prefers env injection over a manifest name', () => {
    const result = rankServiceName(
      [
        candidate({ value: 'checkout-service', signal: 'manifest', source: 'app' }),
        candidate({ value: 'checkoutservice', signal: 'env_injection', source: 'iac' }),
      ],
      []
    );
    expect(result?.value).toBe('checkoutservice');
    expect(result?.predicted).toBe(true);
  });

  it('boosts a candidate exactly observed in logs and returns the logged value', () => {
    const result = rankServiceName(
      [
        candidate({ value: 'checkoutservice', signal: 'env_injection' }),
        candidate({ value: 'cart', signal: 'env_injection' }),
      ],
      ['cart']
    );
    expect(result?.value).toBe('cart');
    expect(result?.predicted).toBe(false);
    expect(result?.evidence).toContain('logs: observed service.name=cart');
  });

  it('matches via normalization and returns the value as it appears in logs', () => {
    const result = rankServiceName(
      [candidate({ value: 'checkout-service', signal: 'manifest' })],
      ['checkoutService']
    );
    expect(result?.predicted).toBe(false);
    expect(result?.value).toBe('checkoutService');
  });

  it('keeps the highest-priority candidate as predicted when logs have no match', () => {
    const result = rankServiceName(
      [candidate({ value: 'checkoutservice', signal: 'env_injection' })],
      ['unrelated']
    );
    expect(result?.predicted).toBe(true);
    expect(result?.value).toBe('checkoutservice');
    expect(result?.confidence).toBeGreaterThan(0);
  });

  it('collects evidence from all candidates that agree on the resolved value', () => {
    const result = rankServiceName(
      [
        candidate({ value: 'checkoutservice', signal: 'env_injection', evidence: 'code: iac' }),
        candidate({ value: 'checkoutservice', signal: 'sdk_config', evidence: 'code: app' }),
      ],
      []
    );
    expect(result?.evidence).toEqual(expect.arrayContaining(['code: iac', 'code: app']));
  });
});

describe('collectServiceNameCandidatesFromCode', () => {
  it('extracts env injection, sdk and deployment values from code hits', async () => {
    const hitsByQuery: Record<string, CodeHit[]> = {};
    const searchCode = jest.fn(async (_repo: string, query: string): Promise<CodeHit[]> => {
      if (query.includes('OTEL_SERVICE_NAME')) {
        return [
          { file: 'deploy/main.tf', line: 12, snippet: 'OTEL_SERVICE_NAME = "checkoutservice"' },
        ];
      }
      if (query.includes('set service name')) {
        return [{ file: 'src/tracing.ts', line: 8, snippet: 'setServiceName("checkout-service")' }];
      }
      return hitsByQuery[query] ?? [];
    });

    const candidates = await collectServiceNameCandidatesFromCode({
      repository: 'acme/checkout',
      fingerprint: 'abc',
      searchCode,
    });

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'checkoutservice',
          signal: 'env_injection',
          source: 'iac',
        }),
        expect.objectContaining({ value: 'checkout-service', signal: 'sdk_config', source: 'app' }),
      ])
    );
    expect(candidates[0].evidence).toContain('acme/checkout@abc');
  });

  it('de-duplicates identical value+signal pairs', async () => {
    const searchCode = jest.fn(async (_repo: string, query: string): Promise<CodeHit[]> => {
      if (query.includes('OTEL_SERVICE_NAME')) {
        return [
          { file: 'a.tf', line: 1, snippet: 'OTEL_SERVICE_NAME=svc' },
          { file: 'b.tf', line: 2, snippet: 'OTEL_SERVICE_NAME=svc' },
        ];
      }
      return [];
    });

    const candidates = await collectServiceNameCandidatesFromCode({
      repository: 'acme/checkout',
      fingerprint: undefined,
      searchCode,
    });

    const envCandidates = candidates.filter(
      (c) => c.signal === 'env_injection' && c.value === 'svc'
    );
    expect(envCandidates).toHaveLength(1);
  });
});

describe('resolveServiceName', () => {
  it('resolves and verifies end to end', async () => {
    const searchCode = jest.fn(
      async (_repo: string, query: string): Promise<CodeHit[]> =>
        query.includes('OTEL_SERVICE_NAME')
          ? [{ file: 'main.tf', line: 3, snippet: 'OTEL_SERVICE_NAME=checkoutservice' }]
          : []
    );

    const result = await resolveServiceName({
      repository: 'acme/checkout',
      fingerprint: 'sha1',
      searchCode,
      observedServiceNames: ['checkoutservice'],
    });

    expect(result?.value).toBe('checkoutservice');
    expect(result?.predicted).toBe(false);
  });
});
