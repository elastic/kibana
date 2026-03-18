/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSigeventsSnapshotKIsIndex,
  SIGEVENTS_FEATURES_INDEX_PATTERN,
} from './sigevents_kis_index';

describe('sigevents_kis_index', () => {
  it('exports the expected index pattern', () => {
    expect(SIGEVENTS_FEATURES_INDEX_PATTERN).toBe('sigevents-streams-features-*');
  });

  it('prefixes with sigevents-streams-features-', () => {
    expect(getSigeventsSnapshotKIsIndex('healthy-baseline')).toBe(
      'sigevents-streams-features-healthy-baseline'
    );
  });

  it('lowercases and replaces invalid characters with dashes', () => {
    expect(getSigeventsSnapshotKIsIndex('Payment Unreachable')).toBe(
      'sigevents-streams-features-payment-unreachable'
    );

    expect(getSigeventsSnapshotKIsIndex('A/B\\C*D?E"F<G>H|I,J#K')).toBe(
      'sigevents-streams-features-a-b-c-d-e-f-g-h-i-j-k'
    );
  });

  it('collapses multiple dashes and trims leading/trailing dashes', () => {
    expect(getSigeventsSnapshotKIsIndex('---Payment---Unreachable---')).toBe(
      'sigevents-streams-features-payment-unreachable'
    );
  });

  it('falls back to unknown if sanitized name is empty', () => {
    expect(getSigeventsSnapshotKIsIndex('   ')).toBe('sigevents-streams-features-unknown');
    expect(getSigeventsSnapshotKIsIndex('###')).toBe('sigevents-streams-features-unknown');
  });
});
