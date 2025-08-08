/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldIncludePointByScore } from './anomaly_score_utils';
import type { SeverityThreshold } from '../../../common/types/anomalies';

describe('anomaly_score_utils', () => {
  describe('shouldIncludePointByScore', () => {
    it('should always include points with score 0', () => {
      const selectedSeverity: SeverityThreshold[] = [
        { min: 25, max: 50 },
        { min: 75, max: 100 },
      ];

      expect(shouldIncludePointByScore(0, selectedSeverity)).toBe(true);
    });

    it('should include all points when no severity thresholds are selected', () => {
      const selectedSeverity: SeverityThreshold[] = [];

      expect(shouldIncludePointByScore(10, selectedSeverity)).toBe(true);
      expect(shouldIncludePointByScore(50, selectedSeverity)).toBe(true);
      expect(shouldIncludePointByScore(90, selectedSeverity)).toBe(true);
    });

    it('should include points within specified threshold ranges', () => {
      const selectedSeverity: SeverityThreshold[] = [
        { min: 25, max: 50 },
        { min: 75, max: 100 },
      ];

      // Within first range
      expect(shouldIncludePointByScore(25, selectedSeverity)).toBe(true);
      expect(shouldIncludePointByScore(35, selectedSeverity)).toBe(true);
      expect(shouldIncludePointByScore(50, selectedSeverity)).toBe(true);

      // Within second range
      expect(shouldIncludePointByScore(75, selectedSeverity)).toBe(true);
      expect(shouldIncludePointByScore(85, selectedSeverity)).toBe(true);
      expect(shouldIncludePointByScore(100, selectedSeverity)).toBe(true);
    });

    it('should exclude points outside specified threshold ranges', () => {
      const selectedSeverity: SeverityThreshold[] = [
        { min: 25, max: 50 },
        { min: 75, max: 100 },
      ];

      // Outside ranges
      expect(shouldIncludePointByScore(10, selectedSeverity)).toBe(false);
      expect(shouldIncludePointByScore(24, selectedSeverity)).toBe(false);
      expect(shouldIncludePointByScore(51, selectedSeverity)).toBe(false);
      expect(shouldIncludePointByScore(74, selectedSeverity)).toBe(false);
      expect(shouldIncludePointByScore(101, selectedSeverity)).toBe(false);
    });

    it('should handle thresholds with only min value (no max)', () => {
      const selectedSeverity: SeverityThreshold[] = [
        { min: 75 }, // All values >= 75
      ];

      // Should include values >= 75
      expect(shouldIncludePointByScore(75, selectedSeverity)).toBe(true);
      expect(shouldIncludePointByScore(100, selectedSeverity)).toBe(true);
      expect(shouldIncludePointByScore(200, selectedSeverity)).toBe(true);

      // Should exclude values < 75
      expect(shouldIncludePointByScore(50, selectedSeverity)).toBe(false);
      expect(shouldIncludePointByScore(74, selectedSeverity)).toBe(false);
    });

    it('should handle multiple non-contiguous ranges correctly', () => {
      const selectedSeverity: SeverityThreshold[] = [
        { min: 0, max: 25 }, // Low range
        { min: 75 }, // High range (75+)
      ];

      // Low range
      expect(shouldIncludePointByScore(0, selectedSeverity)).toBe(true);
      expect(shouldIncludePointByScore(10, selectedSeverity)).toBe(true);
      expect(shouldIncludePointByScore(25, selectedSeverity)).toBe(true);

      // High range
      expect(shouldIncludePointByScore(75, selectedSeverity)).toBe(true);
      expect(shouldIncludePointByScore(100, selectedSeverity)).toBe(true);

      // Middle range (excluded)
      expect(shouldIncludePointByScore(26, selectedSeverity)).toBe(false);
      expect(shouldIncludePointByScore(50, selectedSeverity)).toBe(false);
      expect(shouldIncludePointByScore(74, selectedSeverity)).toBe(false);
    });
  });
});
