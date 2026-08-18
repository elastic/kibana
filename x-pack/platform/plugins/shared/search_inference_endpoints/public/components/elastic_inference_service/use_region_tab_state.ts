/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { useSetSelection } from '../../hooks/use_set_selection';
import { getZoneGroups, regionKey } from '../../utils/eis_utils';
import type { CspRegion } from '../../../common/types';

export const useRegionTabState = (availableRegions: CspRegion[]) => {
  const allRegionKeys = useMemo(() => availableRegions.map(regionKey), [availableRegions]);
  const regionSelection = useSetSelection(allRegionKeys);

  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  const zoneGroups = useMemo(() => getZoneGroups(availableRegions), [availableRegions]);
  const isAllExpanded = zoneGroups.length > 0 && expandedZones.size === zoneGroups.length;

  const handleToggleExpand = useCallback((zoneId: string, isOpen: boolean) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(zoneId);
      } else {
        next.delete(zoneId);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (zoneGroups.length === 0) return;
    if (expandedZones.size === zoneGroups.length) {
      setExpandedZones(new Set());
    } else {
      setExpandedZones(new Set(zoneGroups.map((z) => z.geo)));
    }
  }, [expandedZones.size, zoneGroups]);

  return {
    regionSelection,
    zoneGroups,
    expandedZones,
    isAllExpanded,
    handleToggleExpand,
    handleExpandAll,
  };
};
