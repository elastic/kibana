/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyPhases } from '@kbn/streams-schema';
import { buildLifecycleSummaryPhases, getSelectedIlmPhases } from './ilm_lifecycle_summary_helpers';

describe('ilm_lifecycle_summary_helpers', () => {
  describe('getSelectedIlmPhases', () => {
    const ilmStatsPhases: IlmPolicyPhases = {
      hot: { name: 'hot', min_age: '0d', size_in_bytes: 1000, rollover: {} },
      warm: { name: 'warm', min_age: '30d', size_in_bytes: 1000 },
      delete: { name: 'delete', min_age: '60d' },
    };

    it('uses ilmStatsPhases when flyout is closed', () => {
      expect(
        getSelectedIlmPhases({
          isEditLifecycleFlyoutOpen: false,
          previewPhases: null,
          editFlyoutInitialPhases: null,
          ilmStatsPhases,
        })
      ).toEqual(['hot', 'warm', 'delete']);
    });

    it('uses previewPhases when flyout is open', () => {
      const previewPhases: IlmPolicyPhases = {
        hot: { name: 'hot', min_age: '0d', size_in_bytes: 1000, rollover: {} },
        delete: { name: 'delete', min_age: '60d' },
      };

      expect(
        getSelectedIlmPhases({
          isEditLifecycleFlyoutOpen: true,
          previewPhases,
          editFlyoutInitialPhases: ilmStatsPhases,
          ilmStatsPhases,
        })
      ).toEqual(['hot', 'delete']);
    });

    it('falls back to editFlyoutInitialPhases when flyout is open and previewPhases is null', () => {
      const initialPhases: IlmPolicyPhases = {
        hot: { name: 'hot', min_age: '0d', size_in_bytes: 1000, rollover: {} },
        cold: { name: 'cold', min_age: '30d', size_in_bytes: 1000 },
        delete: { name: 'delete', min_age: '60d' },
      };

      expect(
        getSelectedIlmPhases({
          isEditLifecycleFlyoutOpen: true,
          previewPhases: null,
          editFlyoutInitialPhases: initialPhases,
          ilmStatsPhases,
        })
      ).toEqual(['hot', 'cold', 'delete']);
    });
  });

  describe('buildLifecycleSummaryPhases', () => {
    const ilmPhasesMeta = {
      hot: { color: '#f00', description: 'Hot desc' },
      warm: { color: '#fa0', description: 'Warm desc' },
      cold: { color: '#00f', description: 'Cold desc' },
      frozen: { color: '#0ff', description: 'Frozen desc' },
      delete: { color: '#999', description: 'Delete desc' },
    } as const;

    it('marks the last remaining non-delete phase as not removable', () => {
      const ilmStatsPhases: IlmPolicyPhases = {
        hot: {
          name: 'hot',
          min_age: '0d',
          size_in_bytes: 1000,
          rollover: {},
          readonly: true,
        },
        delete: { name: 'delete', min_age: '30d' },
      };

      const phases = buildLifecycleSummaryPhases({
        isEditLifecycleFlyoutOpen: false,
        previewPhases: null,
        ilmStatsPhases,
        ilmPhases: ilmPhasesMeta,
      });

      const hot = phases.find((p) => p.name === 'hot')!;
      expect(hot.isRemoveDisabled).toBe(true);
      expect(hot.removeDisabledReason).toBeDefined();
      expect(hot.isReadOnly).toBe(true);
    });
  });
});
