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
import type { KnowledgeIndicatorClient } from '../../streams/ki';
import {
  CODE_FEATURE_SUBTYPE_LANGUAGE,
  CODE_FEATURE_SUBTYPE_REPO_TYPE,
  CODE_FEATURE_SUBTYPE_SERVICE_NAME,
} from './constants';
import { identifyCodeFeatures } from './identify_code_features';
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
