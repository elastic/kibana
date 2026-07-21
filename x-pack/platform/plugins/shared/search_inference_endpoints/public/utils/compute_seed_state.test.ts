/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeSeedState } from './compute_seed_state';
import type { CspRegion } from '../../common/types';

const usEast: CspRegion = { csp: 'aws', region: 'us-east-1', geo: 'us' };
const euWest: CspRegion = { csp: 'gcp', region: 'europe-west1', geo: 'eu' };
const availableRegions = [usEast, euWest];
const availableGeos = ['eu', 'us'];

describe('computeSeedState', () => {
  // ---------------------------------------------------------------------------
  // No policy
  // ---------------------------------------------------------------------------
  describe('no existing policy (null / undefined / empty)', () => {
    it('defaults to the Geo tab when policy is null', () => {
      const result = computeSeedState(null, availableRegions, availableGeos);
      expect(result.activeTab).toBe('geo');
    });

    it('defaults to the Geo tab when policy is undefined', () => {
      const result = computeSeedState(undefined, availableRegions, availableGeos);
      expect(result.activeTab).toBe('geo');
    });

    it('sets isNewPolicy to true', () => {
      const result = computeSeedState(null, availableRegions, availableGeos);
      expect(result.isNewPolicy).toBe(true);
    });

    it('pre-selects all available regions', () => {
      const result = computeSeedState(null, availableRegions, availableGeos);
      expect(result.regionKeys).toEqual(new Set(['aws::us-east-1', 'gcp::europe-west1']));
    });

    it('pre-selects all available geos', () => {
      const result = computeSeedState(null, availableRegions, availableGeos);
      expect(result.geos).toEqual(new Set(['eu', 'us']));
    });
  });

  // ---------------------------------------------------------------------------
  // Existing geo policy
  // ---------------------------------------------------------------------------
  describe('existing geo policy (allowed_geos)', () => {
    const policy = {
      region_policy: { allowed_geos: ['eu'] },
      created_at: '2024-01-01T00:00:00Z',
    };

    it('activates the Geo tab', () => {
      const result = computeSeedState(policy, availableRegions, availableGeos);
      expect(result.activeTab).toBe('geo');
    });

    it('sets isNewPolicy to false', () => {
      const result = computeSeedState(policy, availableRegions, availableGeos);
      expect(result.isNewPolicy).toBe(false);
    });

    it('seeds only the allowed geos', () => {
      const result = computeSeedState(policy, availableRegions, availableGeos);
      expect(result.geos).toEqual(new Set(['eu']));
    });

    it('leaves regionKeys empty', () => {
      const result = computeSeedState(policy, availableRegions, availableGeos);
      expect(result.regionKeys.size).toBe(0);
    });

    it('filters out allowed_geos that are not in availableGeos', () => {
      const policyWithUnknownGeo = {
        region_policy: { allowed_geos: ['eu', 'apac'] }, // 'apac' not available
        created_at: '2024-01-01T00:00:00Z',
      };
      const result = computeSeedState(policyWithUnknownGeo, availableRegions, availableGeos);
      expect(result.geos).toEqual(new Set(['eu']));
    });

    it('geo policy takes priority when both allowed_geos and allowed_regions are present', () => {
      const bothPresent = {
        region_policy: {
          allowed_geos: ['eu'],
          allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] as CspRegion[],
        },
        created_at: '2024-01-01T00:00:00Z',
      };
      const result = computeSeedState(bothPresent, availableRegions, availableGeos);
      expect(result.activeTab).toBe('geo');
      expect(result.geos).toEqual(new Set(['eu']));
      expect(result.regionKeys.size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Existing regions policy
  // ---------------------------------------------------------------------------
  describe('existing regions policy (allowed_regions)', () => {
    const policy = {
      region_policy: { allowed_regions: [usEast] as CspRegion[] },
      created_at: '2024-01-01T00:00:00Z',
    };

    it('activates the Regions tab', () => {
      const result = computeSeedState(policy, availableRegions, availableGeos);
      expect(result.activeTab).toBe('regions');
    });

    it('sets isNewPolicy to false', () => {
      const result = computeSeedState(policy, availableRegions, availableGeos);
      expect(result.isNewPolicy).toBe(false);
    });

    it('seeds only the allowed regions', () => {
      const result = computeSeedState(policy, availableRegions, availableGeos);
      expect(result.regionKeys).toEqual(new Set(['aws::us-east-1']));
    });

    it('leaves geos empty', () => {
      const result = computeSeedState(policy, availableRegions, availableGeos);
      expect(result.geos.size).toBe(0);
    });

    it('filters out allowed_regions that are not in availableRegions', () => {
      const policyWithUnknownRegion = {
        region_policy: {
          allowed_regions: [
            usEast,
            { csp: 'azure', region: 'eastus', geo: 'us' }, // not in availableRegions
          ] as CspRegion[],
        },
        created_at: '2024-01-01T00:00:00Z',
      };
      const result = computeSeedState(policyWithUnknownRegion, availableRegions, availableGeos);
      expect(result.regionKeys).toEqual(new Set(['aws::us-east-1']));
    });
  });
});
