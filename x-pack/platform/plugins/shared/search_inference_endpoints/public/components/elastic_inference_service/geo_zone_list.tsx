/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckableCard, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { getGeoDisplayName } from '../../utils/eis_utils';
import { scrollableListStyles } from './region_preferences_list.styles';

export interface GeoZoneListProps {
  availableGeos: string[];
  checkedGeos: Set<string>;
  onToggleGeo: (geo: string) => void;
}

export const GeoZoneList: React.FC<GeoZoneListProps> = ({
  availableGeos,
  checkedGeos,
  onToggleGeo,
}) => {
  const euiThemeContext = useEuiTheme();

  return (
    <div css={scrollableListStyles(euiThemeContext)} data-test-subj="manageRegionsGeoList">
      <EuiFlexGroup direction="column" gutterSize="s">
        {availableGeos.map((geo) => (
          <EuiFlexItem key={geo} grow={false} data-test-subj={`geoZoneRow-${geo}`}>
            <EuiCheckableCard
              id={`geo-checkbox-${geo}`}
              checkableType="checkbox"
              label={getGeoDisplayName(geo)}
              checked={checkedGeos.has(geo)}
              onChange={() => onToggleGeo(geo)}
              data-test-subj={`geoZoneCheckbox-${geo}`}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};
