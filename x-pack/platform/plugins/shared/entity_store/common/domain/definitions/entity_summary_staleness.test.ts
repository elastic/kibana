/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEntitySummaryStaleness,
  computeEntitySummaryStalenessReasons,
  getChangedStalenessSignals,
} from './entity_summary_staleness';

describe('entity_summary_staleness', () => {
  describe('buildEntitySummaryStaleness', () => {
    it('captures only the risk score signal', () => {
      expect(buildEntitySummaryStaleness({ riskScoreNorm: 82.97 }, ['risk_score'])).toEqual({
        enabled_signals: ['risk_score'],
        snapshot: { risk_score: 82.97 },
      });
    });
  });

  describe('computeEntitySummaryStalenessReasons', () => {
    it('returns no reasons when staleness is missing', () => {
      const summary = {
        staleness: undefined,
      };

      expect(computeEntitySummaryStalenessReasons(summary, {})).toEqual([]);
    });

    it('does not trigger when risk score is unchanged (risk is the sole signal)', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['risk_score'],
          snapshot: { risk_score: 70 },
        },
      };

      expect(computeEntitySummaryStalenessReasons(summary, { riskScoreNorm: 70 })).toEqual([]);
    });

    it('detects risk score change when risk_score is enabled', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['risk_score'],
          snapshot: { risk_score: 70 },
        },
      };

      expect(computeEntitySummaryStalenessReasons(summary, { riskScoreNorm: 82.97 })).toEqual([
        {
          signal: 'risk_score',
          previousScore: 70,
          currentScore: 82.97,
        },
      ]);
    });

    it('ignores risk score changes within epsilon', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['risk_score'],
          snapshot: { risk_score: 70 },
        },
      };

      expect(computeEntitySummaryStalenessReasons(summary, { riskScoreNorm: 70.005 })).toEqual([]);
    });

    it('builds risk_score snapshot when enabled', () => {
      expect(buildEntitySummaryStaleness({ riskScoreNorm: 82.97 }, ['risk_score'])).toEqual({
        enabled_signals: ['risk_score'],
        snapshot: { risk_score: 82.97 },
      });
    });

    it('ignores unknown enabled signal ids from stored documents', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['future_signal'],
          snapshot: {},
        },
      };

      expect(computeEntitySummaryStalenessReasons(summary, {})).toEqual([]);
    });
  });

  describe('getChangedStalenessSignals', () => {
    it('returns an empty array when there are no reasons', () => {
      expect(getChangedStalenessSignals([])).toEqual([]);
    });

    it('returns the distinct signal ids in first-seen order', () => {
      expect(
        getChangedStalenessSignals([{ signal: 'risk_score', previousScore: 70, currentScore: 90 }])
      ).toEqual(['risk_score']);
    });

    it('dedupes when a signal contributes multiple reasons', () => {
      expect(
        getChangedStalenessSignals([
          { signal: 'risk_score', previousScore: 70, currentScore: 90 },
          { signal: 'risk_score', previousScore: 50, currentScore: 80 },
        ])
      ).toEqual(['risk_score']);
    });
  });
});
