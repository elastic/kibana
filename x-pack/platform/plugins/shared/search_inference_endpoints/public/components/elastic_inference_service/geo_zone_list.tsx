/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getGeoDisplayName } from '../../utils/eis_utils';

export interface GeoZoneListProps {
  availableGeos: string[];
  checkedGeos: Set<string>;
  onToggleGeo: (geo: string) => void;
}

export const GeoZoneList: React.FC<GeoZoneListProps> = ({
  availableGeos,
  checkedGeos,
  onToggleGeo,
}) => (
  <EuiFlexGroup direction="column" gutterSize="s">
    {availableGeos.map((geo) => (
      <EuiFlexItem key={geo}>
        <EuiPanel hasBorder hasShadow={false} paddingSize="s" data-test-subj={`geoZoneRow-${geo}`}>
          <EuiCheckbox
            id={`geo-checkbox-${geo}`}
            label={
              <span>
                <strong>{getGeoDisplayName(geo)}</strong>
                {' — '}
                <EuiTextColor color="subdued">
                  {i18n.translate(
                    'xpack.searchInferenceEndpoints.manageRegions.geo.allAvailableRegions',
                    { defaultMessage: 'All available regions' }
                  )}
                </EuiTextColor>
              </span>
            }
            checked={checkedGeos.has(geo)}
            onChange={() => onToggleGeo(geo)}
            data-test-subj={`geoZoneCheckbox-${geo}`}
          />
        </EuiPanel>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
