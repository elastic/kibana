/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSigeventsSnapshotKIFeaturesIndex,
  SIGEVENTS_FEATURES_TEMP_INDEX_PATTERN,
  getSigeventsSnapshotDiscoveriesIndex,
  SIGEVENTS_DISCOVERIES_DATA_STREAM,
  SIGEVENTS_DISCOVERIES_TEMP_INDEX_PATTERN,
  getSigeventsSnapshotDetectionsIndex,
  SIGEVENTS_DETECTIONS_DATA_STREAM,
  SIGEVENTS_DETECTIONS_TEMP_INDEX_PATTERN,
  getSigeventsSnapshotKnowledgeIndicatorsIndex,
  SIGEVENTS_KNOWLEDGE_INDICATORS_TEMP_INDEX_PATTERN,
} from './sigevents_snapshot_indices';

describe('sigevents_snapshot_indices', () => {
  describe('KI features', () => {
    it('exports the expected index pattern', () => {
      expect(SIGEVENTS_FEATURES_TEMP_INDEX_PATTERN).toBe('sigevents-streams-features-*');
    });

    it('builds a single-dashed per-scenario index', () => {
      expect(getSigeventsSnapshotKIFeaturesIndex('healthy-baseline')).toBe(
        'sigevents-streams-features-healthy-baseline'
      );
    });

    it('lowercases and replaces invalid characters with dashes', () => {
      expect(getSigeventsSnapshotKIFeaturesIndex('Payment Unreachable')).toBe(
        'sigevents-streams-features-payment-unreachable'
      );

      expect(getSigeventsSnapshotKIFeaturesIndex('A/B\\C*D?E"F<G>H|I,J#K')).toBe(
        'sigevents-streams-features-a-b-c-d-e-f-g-h-i-j-k'
      );
    });

    it('collapses multiple dashes and trims leading/trailing dashes', () => {
      expect(getSigeventsSnapshotKIFeaturesIndex('---Payment---Unreachable---')).toBe(
        'sigevents-streams-features-payment-unreachable'
      );
    });

    it('falls back to unknown if sanitized name is empty', () => {
      expect(getSigeventsSnapshotKIFeaturesIndex('   ')).toBe('sigevents-streams-features-unknown');
      expect(getSigeventsSnapshotKIFeaturesIndex('###')).toBe('sigevents-streams-features-unknown');
    });
  });

  describe('discoveries', () => {
    it('exposes the source data stream, cleanup pattern, and per-scenario index', () => {
      expect(SIGEVENTS_DISCOVERIES_DATA_STREAM).toBe('.significant_events-discoveries');
      expect(SIGEVENTS_DISCOVERIES_TEMP_INDEX_PATTERN).toBe('sigevents-discoveries-*');
      expect(getSigeventsSnapshotDiscoveriesIndex('healthy-baseline')).toBe(
        'sigevents-discoveries-healthy-baseline'
      );
    });

    it('keeps the per-scenario index as a regular (non-dot) index the pattern matches', () => {
      const index = getSigeventsSnapshotDiscoveriesIndex('ledger-db-disconnect');
      expect(index.startsWith('.')).toBe(false);
      expect(index.startsWith('sigevents-discoveries-')).toBe(true);
    });

    it('sanitizes the scenario name', () => {
      expect(getSigeventsSnapshotDiscoveriesIndex('Payment Unreachable')).toBe(
        'sigevents-discoveries-payment-unreachable'
      );
      expect(getSigeventsSnapshotDiscoveriesIndex('   ')).toBe('sigevents-discoveries-unknown');
    });
  });

  describe('detections', () => {
    it('exposes the source data stream, cleanup pattern, and per-scenario index', () => {
      expect(SIGEVENTS_DETECTIONS_DATA_STREAM).toBe('.significant_events-detections');
      expect(SIGEVENTS_DETECTIONS_TEMP_INDEX_PATTERN).toBe('sigevents-detections-*');
      expect(getSigeventsSnapshotDetectionsIndex('healthy-baseline')).toBe(
        'sigevents-detections-healthy-baseline'
      );
    });

    it('sanitizes the scenario name', () => {
      expect(getSigeventsSnapshotDetectionsIndex('Payment Unreachable')).toBe(
        'sigevents-detections-payment-unreachable'
      );
      expect(getSigeventsSnapshotDetectionsIndex('###')).toBe('sigevents-detections-unknown');
    });
  });

  describe('knowledge indicators', () => {
    it('exposes the cleanup pattern and per-scenario index', () => {
      expect(SIGEVENTS_KNOWLEDGE_INDICATORS_TEMP_INDEX_PATTERN).toBe(
        'sigevents-knowledge-indicators-*'
      );
      expect(getSigeventsSnapshotKnowledgeIndicatorsIndex('healthy-baseline')).toBe(
        'sigevents-knowledge-indicators-healthy-baseline'
      );
    });

    it('sanitizes the scenario name', () => {
      expect(getSigeventsSnapshotKnowledgeIndicatorsIndex('Payment Unreachable')).toBe(
        'sigevents-knowledge-indicators-payment-unreachable'
      );
      expect(getSigeventsSnapshotKnowledgeIndicatorsIndex('   ')).toBe(
        'sigevents-knowledge-indicators-unknown'
      );
    });
  });
});
