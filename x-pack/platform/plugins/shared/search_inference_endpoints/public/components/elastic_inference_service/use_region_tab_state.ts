/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSetSelection } from '../../hooks/use_set_selection';
import { getZoneGroups, regionKey } from '../../utils/eis_utils';
import type { CspRegion } from '../../../common/types';

export const useRegionTabState = (availableRegions: CspRegion[]) => {
  const allRegionKeys = useMemo(() => availableRegions.map(regionKey), [availableRegions]);
  const regionSelection = useSetSelection(allRegionKeys);

  const zoneGroups = useMemo(() => getZoneGroups(availableRegions), [availableRegions]);

  return {
    regionSelection,
    zoneGroups,
  };
};
