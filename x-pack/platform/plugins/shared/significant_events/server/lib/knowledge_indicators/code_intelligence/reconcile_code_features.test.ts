/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CODE_ANALYSIS_FEATURE_TYPE,
  computeFeatureUuid,
  type Feature,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import { CODE_FEATURE_SUBTYPE_SERVICE_NAME } from './constants';
import { reconcileCodeFeatures } from './reconcile_code_features';

const incomingServiceName = (overrides: Partial<FeatureUpsert> = {}): FeatureUpsert => ({
  id: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
  stream_name: 'logs.checkout',
  type: CODE_ANALYSIS_FEATURE_TYPE,
  subtype: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
  title: 'Service name',
  description: 'Predicted service name',
  properties: { service_name: 'checkoutservice' },
  confidence: 80,
  evidence: ['code: acme/checkout@sha1:main.tf OTEL_SERVICE_NAME'],
  ...overrides,
});

const existingServiceName = (overrides: Partial<Feature> = {}): Feature => ({
  id: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
  uuid: computeFeatureUuid({
    id: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
    stream_name: 'logs.checkout',
  }),
  stream_name: 'logs.checkout',
  type: CODE_ANALYSIS_FEATURE_TYPE,
  subtype: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
  title: 'Service name',
  description: 'Existing',
  properties: { service_name: 'checkoutservice' },
  confidence: 60,
  evidence: ['logs: observed service.name=checkoutservice'],
  ...overrides,
});

describe('reconcileCodeFeatures', () => {
  it('passes through incoming features with the run id when nothing exists', () => {
    const result = reconcileCodeFeatures({
      incoming: [incomingServiceName()],
      existing: [],
      runId: 'run-1',
    });
    expect(result).toHaveLength(1);
    expect(result[0].run_id).toBe('run-1');
    expect(result[0].evidence).toEqual(['code: acme/checkout@sha1:main.tf OTEL_SERVICE_NAME']);
  });

  it('unions evidence and blends confidence when merging onto an existing feature', () => {
    const result = reconcileCodeFeatures({
      incoming: [incomingServiceName()],
      existing: [existingServiceName()],
      runId: 'run-2',
    });
    expect(result[0].evidence).toEqual(
      expect.arrayContaining([
        'code: acme/checkout@sha1:main.tf OTEL_SERVICE_NAME',
        'logs: observed service.name=checkoutservice',
      ])
    );
    // (80 + 60) / 2 rounded
    expect(result[0].confidence).toBe(70);
    expect(result[0].run_id).toBe('run-2');
  });

  it('preserves the exclusion state of the existing feature', () => {
    const result = reconcileCodeFeatures({
      incoming: [incomingServiceName()],
      existing: [existingServiceName({ excluded: true })],
      runId: 'run-3',
    });
    expect(result[0].excluded).toBe(true);
  });
});
