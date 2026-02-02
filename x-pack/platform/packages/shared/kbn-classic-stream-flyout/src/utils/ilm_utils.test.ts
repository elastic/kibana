/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Phases } from '@kbn/index-lifecycle-management-common-shared';
import { getPhaseDescriptions, type PhaseColors } from './ilm_utils';

describe('ilm_utils', () => {
  describe('getPhaseDescriptions', () => {
    const colors: PhaseColors = {
      hot: '#FF0000',
      warm: '#FFA500',
      cold: '#0000FF',
      frozen: '#00FFFF',
    };

    const collect = (phases: Phases) =>
      getPhaseDescriptions(phases, colors).map((p) => p.description);

    it('returns empty array when no known phases', () => {
      expect(collect({})).toEqual([]);
    });

    it('returns empty array when only delete phase', () => {
      expect(collect({ delete: { min_age: '365d', actions: {} } })).toEqual([]);
    });

    it('orders phases from hot->frozen after reverse logic', () => {
      const result = getPhaseDescriptions(
        {
          hot: { actions: {} },
          warm: { min_age: '7d', actions: {} },
          cold: { min_age: '30d', actions: {} },
          frozen: { min_age: '90d', actions: {} },
        },
        colors
      );
      // After reverse, first should be hot... last frozen
      expect(result[0].description).toMatch(/^Hot/);
      expect(result[1].description).toMatch(/^Warm/);
      expect(result[2].description).toMatch(/^Cold/);
      expect(result[3].description).toMatch(/^Frozen/);
    });

    it('handles delete phase supplying initial previousStartAge', () => {
      const result = getPhaseDescriptions(
        {
          hot: { actions: {} },
          delete: { min_age: '180d', actions: {} },
        },
        colors
      );
      // Delete phase min_age becomes the end time for hot
      expect(result).toHaveLength(1);
      expect(result[0].description).toMatch(/Hot until 180d/);
    });

    it('handles single phase', () => {
      expect(collect({ hot: { actions: {} } })).toEqual(['Hot indefinitely']);
      expect(collect({ warm: { min_age: '7d', actions: {} } })).toEqual(['Warm indefinitely']);
      expect(collect({ cold: { min_age: '30d', actions: {} } })).toEqual(['Cold indefinitely']);
      expect(collect({ frozen: { min_age: '90d', actions: {} } })).toEqual(['Frozen indefinitely']);
    });

    it('handles phases without hot phase', () => {
      const result = getPhaseDescriptions(
        {
          warm: { min_age: '7d', actions: {} },
          cold: { min_age: '30d', actions: {} },
        },
        colors
      );
      expect(result[0].description).toMatch(/Warm until 30d/);
      expect(result[1].description).toMatch(/Cold indefinitely/);
    });

    it('handles non-continuous phases', () => {
      const result = getPhaseDescriptions(
        {
          hot: { actions: {} },
          frozen: { min_age: '90d', actions: {} },
        },
        colors
      );
      expect(result[0].description).toMatch(/Hot until 90d/);
      expect(result[1].description).toMatch(/Frozen indefinitely/);
    });

    it('handles various time units in min_age', () => {
      const result = getPhaseDescriptions(
        {
          hot: { actions: {} },
          warm: { min_age: '7d', actions: {} },
          cold: { min_age: '30d', actions: {} },
          frozen: { min_age: '1h', actions: {} },
        },
        colors
      );
      expect(result[0].description).toMatch(/until 7d/);
      expect(result[1].description).toMatch(/until 30d/);
      expect(result[2].description).toMatch(/until 1h/);
      expect(result[3].description).toMatch(/indefinitely/);
    });

    it('handles all phases with delete phase', () => {
      const result = getPhaseDescriptions(
        {
          hot: { actions: {} },
          warm: { min_age: '7d', actions: {} },
          cold: { min_age: '30d', actions: {} },
          frozen: { min_age: '90d', actions: {} },
          delete: { min_age: '365d', actions: {} },
        },
        colors
      );
      expect(result).toHaveLength(4);
      expect(result[3].description).toMatch(/Frozen until 365d/);
    });
  });
});
