/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { BaseFeature, Feature } from '@kbn/streams-schema';
import { reconcileInferredFeatures } from './reconcile_features';

const STREAM = 'logs-app';
const RUN_ID = 'run-1';

function baseFeature(overrides: Partial<BaseFeature> = {}): BaseFeature {
  return {
    id: 'feat-1',
    stream_name: STREAM,
    type: 'entity',
    subtype: 'service',
    title: 'A title',
    description: 'A description',
    properties: { name: 'checkout' },
    confidence: 80,
    ...overrides,
  };
}

function feature(overrides: Partial<Feature> = {}): Feature {
  return {
    ...baseFeature(),
    ...overrides,
  };
}

const logger = loggerMock.create() as unknown as Logger;

describe('reconcileInferredFeatures with excluded features', () => {
  it('drops a raw feature whose id matches an excluded feature (case-insensitive)', () => {
    const excluded: Feature = feature({ id: 'Excluded-Service', excluded: true });
    const raw = baseFeature({ id: 'excluded-service', title: 'Re-suggested' });

    const { newFeatures, updatedFeatures, codeIgnoredCount } = reconcileInferredFeatures({
      rawFeatures: [raw],
      allKnownFeatures: [],
      discoveredFeatures: [],
      ignoredFeatures: [],
      excludedFeatures: [excluded],
      runId: RUN_ID,
      logger,
    });

    expect(codeIgnoredCount).toBe(1);
    expect(newFeatures).toEqual([]);
    expect(updatedFeatures).toEqual([]);
  });

  it('drops a raw feature whose fingerprint matches an excluded feature', () => {
    const excluded: Feature = feature({
      id: 'old-id',
      type: 'entity',
      subtype: 'service',
      properties: { name: 'checkout' },
      excluded: true,
    });
    // Same fingerprint, different id.
    const raw = baseFeature({
      id: 'brand-new-id',
      type: 'entity',
      subtype: 'service',
      properties: { name: 'checkout' },
    });

    const { newFeatures, updatedFeatures, codeIgnoredCount } = reconcileInferredFeatures({
      rawFeatures: [raw],
      allKnownFeatures: [],
      discoveredFeatures: [],
      ignoredFeatures: [],
      excludedFeatures: [excluded],
      runId: RUN_ID,
      logger,
    });

    expect(codeIgnoredCount).toBe(1);
    expect(newFeatures).toEqual([]);
    expect(updatedFeatures).toEqual([]);
  });

  it('keeps raw features that do not match any excluded by id or fingerprint', () => {
    const excluded: Feature = feature({
      id: 'svc-checkout',
      type: 'entity',
      subtype: 'service',
      properties: { name: 'checkout' },
      excluded: true,
    });
    const raw = baseFeature({
      id: 'svc-payments',
      type: 'entity',
      subtype: 'service',
      properties: { name: 'payments' },
    });

    const { newFeatures, codeIgnoredCount } = reconcileInferredFeatures({
      rawFeatures: [raw],
      allKnownFeatures: [],
      discoveredFeatures: [],
      ignoredFeatures: [],
      excludedFeatures: [excluded],
      runId: RUN_ID,
      logger,
    });

    expect(codeIgnoredCount).toBe(0);
    expect(newFeatures).toHaveLength(1);
    expect(newFeatures[0].id).toBe('svc-payments');
    expect(newFeatures[0].run_id).toBe(RUN_ID);
  });
});
