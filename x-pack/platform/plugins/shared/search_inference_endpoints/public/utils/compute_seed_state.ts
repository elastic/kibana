/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { regionKey } from './eis_utils';
import type { PolicyMode } from '../types';
import type { CspRegion, RegionPolicyResponse } from '../../common/types';

export interface SeedState {
  activeTab: PolicyMode;
  /** True when the modal opens with no existing policy. */
  isNewPolicy: boolean;
  regionKeys: Set<string>;
  geos: Set<string>;
}

export const computeSeedState = (
  policy: RegionPolicyResponse | null | undefined,
  availableRegions: CspRegion[],
  availableGeos: string[]
): SeedState => {
  const regionPolicy = policy?.region_policy;

  if (regionPolicy?.allowed_geos && regionPolicy.allowed_geos.length > 0) {
    const availableGeoSet = new Set(availableGeos);
    return {
      activeTab: 'geo',
      isNewPolicy: false,
      regionKeys: new Set<string>(),
      geos: new Set(regionPolicy.allowed_geos.filter((g) => availableGeoSet.has(g))),
    };
  }

  const existing = regionPolicy?.allowed_regions ?? [];
  const noPolicy = existing.length === 0;

  return {
    activeTab: noPolicy ? 'geo' : 'regions',
    isNewPolicy: noPolicy,
    regionKeys: noPolicy
      ? new Set(availableRegions.map(regionKey))
      : new Set(
          existing.map(regionKey).filter((k) => availableRegions.some((r) => regionKey(r) === k))
        ),
    geos: noPolicy ? new Set(availableGeos) : new Set<string>(),
  };
};
