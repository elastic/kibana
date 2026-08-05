/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { Feature, FeatureUpsert } from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import { CODE_FEATURE_SUBTYPE_LANGUAGE, CODE_FEATURE_SUBTYPE_REPO_TYPE } from './constants';
import { identifyCodeFeaturesForService } from './identify_code_features';

const REPO = 'acme/checkout';

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

describe('identifyCodeFeaturesForService (repo-level vs service-level keying)', () => {
  it('keys repo_type by the repository (not the service) and per-service language by the service', async () => {
    const { kiClient, bulk } = createKiClient([]);
    const result = await identifyCodeFeaturesForService({
      repository: REPO,
      gitSha: 'sha-new',
      languageHistogram: [{ language: 'go', count: 100 }],
      serviceName: 'cartservice',
      language: 'go',
      kiClient,
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
      gitSha: 'sha-new',
      languageHistogram: [{ language: 'go', count: 100 }],
      serviceName: 'cartservice',
      kiClient,
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
