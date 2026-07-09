/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  CODE_ANALYSIS_FEATURE_TYPE,
  computeFeatureUuid,
  type Feature,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import {
  CODE_FEATURE_SUBTYPE_LANGUAGE,
  CODE_FEATURE_SUBTYPE_REPO_TYPE,
  CODE_FEATURE_SUBTYPE_SERVICE_NAME,
} from './constants';
import {
  identifyCodeFeatures,
  identifyCodeFeaturesForRepository,
  identifyCodeFeaturesForService,
} from './identify_code_features';
import type { CodeHit, CodeRepositoryReader } from './types';

const STREAM = 'logs.checkout';
const REPO = 'acme/checkout';
const INDEX = 'logs.checkout-*';

const codeAnalysisRepoProbe = (repository: string): Feature => ({
  id: 'code-probe',
  uuid: computeFeatureUuid({
    id: 'code-probe',
    stream_name: STREAM,
    type: CODE_ANALYSIS_FEATURE_TYPE,
  }),
  stream_name: STREAM,
  type: CODE_ANALYSIS_FEATURE_TYPE,
  subtype: 'dataset',
  description: 'existing code analysis feature',
  properties: { repository },
  confidence: 70,
});

const createReader = (overrides: Partial<CodeRepositoryReader> = {}): CodeRepositoryReader => ({
  getChangeFingerprint: jest.fn(async () => 'sha-new'),
  getLanguageHistogram: jest.fn(async () => [
    { language: 'go', count: 100 },
    { language: 'hcl', count: 20 },
  ]),
  getObservedServiceNames: jest.fn(async () => ['checkoutservice']),
  searchCode: jest.fn(
    async (_repo: string, query: string): Promise<CodeHit[]> =>
      query.includes('OTEL_SERVICE_NAME')
        ? [{ file: 'main.tf', line: 4, snippet: 'OTEL_SERVICE_NAME=checkoutservice' }]
        : []
  ),
  getLoggingChunks: jest.fn(async () => []),
  discoverServices: jest.fn(async () => []),
  detectIacSignals: jest.fn(async () => []),
  ...overrides,
});

interface IndexFeatureOperation {
  index: { feature: FeatureUpsert & { expires_at?: string } };
}

const createKiClient = (existing: Feature[]) => {
  const bulk = jest.fn<Promise<void>, [string, IndexFeatureOperation[]]>(async () => undefined);
  const kiClient = {
    getFeatures: jest.fn(async () => ({ hits: existing })),
    getDefaultExpiresAt: jest.fn(() => '2099-01-01T00:00:00.000Z'),
    bulk,
  } as unknown as KnowledgeIndicatorClient;
  return { kiClient, bulk };
};

describe('identifyCodeFeatures', () => {
  it('returns no_repo when no repository can be resolved', async () => {
    const { kiClient } = createKiClient([]);
    const result = await identifyCodeFeatures({
      streamName: STREAM,
      samplingIndex: INDEX,
      kiClient,
      reader: createReader(),
      logger: loggerMock.create(),
      runId: 'run-1',
    });
    expect(result.status).toBe('no_repo');
  });

  it('noops when the repository fingerprint is unchanged', async () => {
    const existing: Feature[] = [
      {
        ...codeAnalysisRepoProbe(REPO),
        id: CODE_FEATURE_SUBTYPE_REPO_TYPE,
        subtype: CODE_FEATURE_SUBTYPE_REPO_TYPE,
        meta: { repository: REPO, change_fingerprint: 'sha-current' },
      },
    ];
    const { kiClient, bulk } = createKiClient(existing);
    const result = await identifyCodeFeatures({
      streamName: STREAM,
      samplingIndex: INDEX,
      kiClient,
      reader: createReader({ getChangeFingerprint: jest.fn(async () => 'sha-current') }),
      logger: loggerMock.create(),
      runId: 'run-1',
    });
    expect(result.status).toBe('noop');
    expect(bulk).not.toHaveBeenCalled();
  });

  it('persists repo_type, language and service_name features on change', async () => {
    const { kiClient, bulk } = createKiClient([codeAnalysisRepoProbe(REPO)]);
    const result = await identifyCodeFeatures({
      streamName: STREAM,
      samplingIndex: INDEX,
      kiClient,
      reader: createReader(),
      logger: loggerMock.create(),
      runId: 'run-42',
    });

    expect(result.status).toBe('updated');
    expect(result.repository).toBe(REPO);

    const subtypes = result.features?.map((f) => f.subtype).sort();
    expect(subtypes).toEqual(
      [
        CODE_FEATURE_SUBTYPE_LANGUAGE,
        CODE_FEATURE_SUBTYPE_REPO_TYPE,
        CODE_FEATURE_SUBTYPE_SERVICE_NAME,
      ].sort()
    );

    const repoType = result.features?.find((f) => f.subtype === CODE_FEATURE_SUBTYPE_REPO_TYPE);
    expect(repoType?.properties.repo_type).toBe('both');
    expect(repoType?.meta).toEqual({ repository: REPO, change_fingerprint: 'sha-new' });

    const serviceName = result.features?.find(
      (f) => f.subtype === CODE_FEATURE_SUBTYPE_SERVICE_NAME
    );
    expect(serviceName?.properties.service_name).toBe('checkoutservice');
    expect(serviceName?.properties.predicted).toBe(false);

    expect(bulk).toHaveBeenCalledTimes(1);
    const operations = bulk.mock.calls[0][1];
    expect(operations).toHaveLength(3);
    // Code features are persisted as durable KIs (no expiry).
    expect(operations[0].index.feature.expires_at).toBeUndefined();
    expect(operations[0].index.feature.run_id).toBe('run-42');
  });
});

describe('identifyCodeFeaturesForRepository (code-first, no logs)', () => {
  it('resolves a predicted service name from code and keys the KIs by it', async () => {
    const { kiClient, bulk } = createKiClient([]);
    const result = await identifyCodeFeaturesForRepository({
      repository: REPO,
      kiClient,
      // No observed service names available (no logs) -> predicted.
      reader: createReader({ getObservedServiceNames: jest.fn(async () => []) }),
      logger: loggerMock.create(),
      runId: 'run-code-first',
    });

    expect(result.status).toBe('updated');
    expect(result.services).toHaveLength(1);
    const [service] = result.services;
    expect(service.streamName).toBe('checkoutservice');

    const serviceName = service.features?.find(
      (f) => f.subtype === CODE_FEATURE_SUBTYPE_SERVICE_NAME
    );
    expect(serviceName?.properties.service_name).toBe('checkoutservice');
    expect(serviceName?.properties.predicted).toBe(true);

    // KIs are written to the resolved service.name stream key, not the repo.
    expect(bulk).toHaveBeenCalledTimes(1);
    expect(bulk.mock.calls[0][0]).toBe('checkoutservice');
  });

  it('resolves one service per distinct service in a monorepo', async () => {
    const { kiClient, bulk } = createKiClient([]);
    const result = await identifyCodeFeaturesForRepository({
      repository: REPO,
      kiClient,
      reader: createReader({
        getObservedServiceNames: jest.fn(async () => []),
        searchCode: jest.fn(
          async (_repo: string, query: string): Promise<CodeHit[]> =>
            query.includes('OTEL_SERVICE_NAME')
              ? [
                  {
                    file: 'checkout/deploy.tf',
                    line: 1,
                    snippet: 'OTEL_SERVICE_NAME=checkoutservice',
                  },
                  { file: 'cart/deploy.tf', line: 2, snippet: 'OTEL_SERVICE_NAME=cartservice' },
                ]
              : []
        ),
      }),
      logger: loggerMock.create(),
      runId: 'run-monorepo',
    });

    expect(result.status).toBe('updated');
    expect(result.services.map((s) => s.streamName).sort()).toEqual([
      'cartservice',
      'checkoutservice',
    ]);
    // One bulk write per service, keyed by that service name.
    expect(bulk).toHaveBeenCalledTimes(2);
    expect(bulk.mock.calls.map((call) => call[0]).sort()).toEqual([
      'cartservice',
      'checkoutservice',
    ]);
  });

  it('enumerates services via SCS directory discovery (monorepo, no env strings)', async () => {
    const { kiClient, bulk } = createKiClient([]);
    const result = await identifyCodeFeaturesForRepository({
      repository: REPO,
      kiClient,
      reader: createReader({
        // No env-injection strings found, but SCS discovers service directories.
        searchCode: jest.fn(async () => []),
        discoverServices: jest.fn(async () => ['checkout', 'cart', 'frontend']),
      }),
      logger: loggerMock.create(),
      runId: 'run-discovery',
    });

    expect(result.status).toBe('updated');
    expect(result.services.map((s) => s.streamName).sort()).toEqual([
      'cart',
      'checkout',
      'frontend',
    ]);
    expect(bulk).toHaveBeenCalledTimes(3);
    expect(bulk.mock.calls.map((call) => call[0]).sort()).toEqual(['cart', 'checkout', 'frontend']);
  });

  it('skips the repository when no service name can be resolved from code', async () => {
    const { kiClient, bulk } = createKiClient([]);
    const result = await identifyCodeFeaturesForRepository({
      repository: REPO,
      kiClient,
      reader: createReader({ searchCode: jest.fn(async () => []) }),
      logger: loggerMock.create(),
      runId: 'run-code-first',
    });

    expect(result.status).toBe('no_service');
    expect(result.services).toEqual([]);
    expect(bulk).not.toHaveBeenCalled();
  });
});

describe('identifyCodeFeaturesForService (repo-level vs service-level keying)', () => {
  it('keys repo_type by the repository (not the service) and per-service language by the service', async () => {
    const { kiClient, bulk } = createKiClient([]);
    const result = await identifyCodeFeaturesForService({
      repository: REPO,
      serviceName: 'cartservice',
      language: 'go',
      kiClient,
      reader: createReader(),
      logger: loggerMock.create(),
      runId: 'run-svc',
    });

    expect(result.status).toBe('updated');
    expect(result.streamName).toBe('cartservice');

    const byStream = Object.fromEntries(bulk.mock.calls.map((call) => [call[0], call[1]]));
    expect(Object.keys(byStream).sort()).toEqual([REPO, 'cartservice'].sort());

    // repo_type is written to the repository stream so it collapses to one KI
    // per repository regardless of how many services reference it.
    const repoOps = byStream[REPO];
    expect(repoOps.map((op) => op.index.feature.subtype)).toContain(CODE_FEATURE_SUBTYPE_REPO_TYPE);
    expect(repoOps.every((op) => op.index.feature.stream_name === REPO)).toBe(true);
    // With an agent-provided per-service language, the repo-wide language is not
    // emitted at the repository level.
    expect(repoOps.map((op) => op.index.feature.subtype)).not.toContain(
      CODE_FEATURE_SUBTYPE_LANGUAGE
    );

    // The service-specific language is keyed by the service stream.
    const serviceOps = byStream.cartservice;
    expect(serviceOps.map((op) => op.index.feature.subtype)).toEqual([
      CODE_FEATURE_SUBTYPE_LANGUAGE,
    ]);
    expect(serviceOps[0].index.feature.properties.language).toBe('go');
    expect(serviceOps[0].index.feature.stream_name).toBe('cartservice');
  });

  it('writes the repo-wide primary language at the repository level when the agent gives none', async () => {
    const { kiClient, bulk } = createKiClient([]);
    await identifyCodeFeaturesForService({
      repository: REPO,
      serviceName: 'cartservice',
      kiClient,
      reader: createReader(),
      logger: loggerMock.create(),
      runId: 'run-svc',
    });

    // Only the repository stream is written (repo_type + primary language); no
    // per-service code_analysis feature is created.
    expect(bulk.mock.calls.map((call) => call[0])).toEqual([REPO]);
    const repoOps = bulk.mock.calls[0][1];
    expect(repoOps.map((op) => op.index.feature.subtype).sort()).toEqual(
      [CODE_FEATURE_SUBTYPE_LANGUAGE, CODE_FEATURE_SUBTYPE_REPO_TYPE].sort()
    );
    expect(repoOps.every((op) => op.index.feature.stream_name === REPO)).toBe(true);
  });
});
