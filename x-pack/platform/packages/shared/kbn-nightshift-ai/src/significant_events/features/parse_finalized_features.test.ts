/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_IDENTIFIED_FEATURES_PER_ITERATION,
  parseFinalizedFeatures,
} from './parse_finalized_features';

const feature = (overrides: Record<string, unknown> = {}) => ({
  id: 'okta',
  type: 'technology',
  subtype: 'identity_provider',
  title: 'Okta',
  description: 'Okta identity provider',
  properties: { name: 'okta' },
  confidence: 90,
  evidence: ['service.name=okta'],
  tags: ['identity'],
  ...overrides,
});

describe('parseFinalizedFeatures', () => {
  it('keeps valid unique features and well-formed ignored entries', () => {
    const { features, ignoredFeatures } = parseFinalizedFeatures({
      features: [
        feature({
          filter: { field: 'service.name' },
          evidence: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'],
        }),
        feature({ id: 'empty-properties', properties: {} }),
        feature({ title: 'Duplicate Okta' }),
      ],
      ignored_features: [
        {
          feature_id: 'excluded',
          feature_title: 'Excluded',
          excluded_feature_id: 'known-excluded',
          reason: 'Same feature',
        },
        { feature_id: 42 },
      ],
    });

    expect(features).toEqual([
      expect.objectContaining({
        id: 'okta',
        title: 'Okta',
        filter: undefined,
        evidence: ['e1', 'e2', 'e3', 'e4', 'e5'],
      }),
    ]);
    expect(ignoredFeatures).toEqual([
      {
        feature_id: 'excluded',
        feature_title: 'Excluded',
        excluded_feature_id: 'known-excluded',
        reason: 'Same feature',
      },
    ]);
  });

  it('caps the number of returned features', () => {
    const { features } = parseFinalizedFeatures({
      features: Array.from({ length: MAX_IDENTIFIED_FEATURES_PER_ITERATION + 1 }, (_, index) =>
        feature({ id: `feature-${index}`, properties: { name: `feature-${index}` } })
      ),
    });

    expect(features).toHaveLength(MAX_IDENTIFIED_FEATURES_PER_ITERATION);
  });
});
