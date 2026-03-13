/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSigeventsSnapshotFeaturesIndex,
  SIGEVENTS_FEATURES_INDEX_PATTERN,
} from './sigevents_features_index';

describe('sigevents_features_index', () => {
  it('exports the expected index pattern', () => {
    expect(SIGEVENTS_FEATURES_INDEX_PATTERN).toBe('sigevents-streams-features-*');
  });

  it('prefixes with sigevents-streams-features-', () => {
    expect(getSigeventsSnapshotFeaturesIndex('healthy-baseline')).toBe(
      'sigevents-streams-features-healthy-baseline'
    );
  });

  it('lowercases and replaces invalid characters with dashes', () => {
    expect(getSigeventsSnapshotFeaturesIndex('Payment Unreachable')).toBe(
      'sigevents-streams-features-payment-unreachable'
    );

    expect(getSigeventsSnapshotFeaturesIndex('A/B\\C*D?E"F<G>H|I,J#K')).toBe(
      'sigevents-streams-features-a-b-c-d-e-f-g-h-i-j-k'
    );
  });

  it('collapses multiple dashes and trims leading/trailing dashes', () => {
    expect(getSigeventsSnapshotFeaturesIndex('---Payment---Unreachable---')).toBe(
      'sigevents-streams-features-payment-unreachable'
    );
  });

  it('falls back to unknown if sanitized name is empty', () => {
    expect(getSigeventsSnapshotFeaturesIndex('   ')).toBe('sigevents-streams-features-unknown');
    expect(getSigeventsSnapshotFeaturesIndex('###')).toBe('sigevents-streams-features-unknown');
  });
});
