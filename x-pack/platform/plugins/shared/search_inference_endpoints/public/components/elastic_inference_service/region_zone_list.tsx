/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiPanel, useEuiTheme } from '@elastic/eui';
import type { ZoneGroup } from '../../utils/eis_utils';
import { RegionZoneItem } from './region_zone_item';
import { scrollableListStyles } from './region_preferences_list.styles';

export type { ZoneGroup };

interface RegionZoneListProps {
  zoneGroups: ZoneGroup[];
  checkedKeys: Set<string>;
  onToggleRegion: (key: string) => void;
}

export const RegionZoneList: React.FC<RegionZoneListProps> = ({
  zoneGroups,
  checkedKeys,
  onToggleRegion,
}) => {
  const euiThemeContext = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      data-test-subj="manageRegionsRegionList"
    >
      <div css={scrollableListStyles(euiThemeContext)}>
        {zoneGroups.map((zone, index) => (
          <React.Fragment key={zone.geo}>
            {index > 0 && <EuiHorizontalRule margin="none" />}
            <RegionZoneItem zone={zone} checkedKeys={checkedKeys} onToggleRegion={onToggleRegion} />
          </React.Fragment>
        ))}
      </div>
    </EuiPanel>
  );
};
