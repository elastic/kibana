/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import type { ZoneGroup } from '../../utils/eis_utils';
import { RegionZoneItem } from './region_zone_item';

export type { ZoneGroup };

interface RegionZoneListProps {
  zoneGroups: ZoneGroup[];
  checkedKeys: Set<string>;
  expandedZones: Set<string>;
  onToggleRegion: (key: string) => void;
  onToggleExpand: (zoneId: string, isOpen: boolean) => void;
}

export const RegionZoneList: React.FC<RegionZoneListProps> = ({
  zoneGroups,
  checkedKeys,
  expandedZones,
  onToggleRegion,
  onToggleExpand,
}) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {zoneGroups.map((zone) => (
        <RegionZoneItem
          key={zone.geo}
          zone={zone}
          checkedKeys={checkedKeys}
          expandedZones={expandedZones}
          onToggleRegion={onToggleRegion}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </EuiFlexGroup>
  );
};
