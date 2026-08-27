/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getRegionDisplayName, regionKey } from '../../utils/eis_utils';
import type { ZoneGroup } from '../../utils/eis_utils';

export interface RegionZoneItemProps {
  zone: ZoneGroup;
  checkedKeys: Set<string>;
  onToggleRegion: (key: string) => void;
}

export const RegionZoneItem: React.FC<RegionZoneItemProps> = ({
  zone,
  checkedKeys,
  onToggleRegion,
}) => {
  const { euiTheme } = useEuiTheme();
  const checkedCount = zone.regions.filter((r) => checkedKeys.has(regionKey(r))).length;

  return (
    <div data-test-subj={`manageRegionsZone-${zone.geo}`}>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        style={{ padding: `${euiTheme.size.s} ${euiTheme.size.m}` }}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{zone.displayName}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" data-test-subj={`manageRegionsZoneCount-${zone.geo}`}>
            {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.zoneCount', {
              defaultMessage: '{checked} of {total, plural, one {# region} other {# regions}}',
              values: { checked: checkedCount, total: zone.regions.length },
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        style={{ padding: `0 ${euiTheme.size.m} ${euiTheme.size.s}` }}
      >
        {zone.regions.map((region) => {
          const key = regionKey(region);
          return (
            <EuiFlexItem key={key} grow={false}>
              <EuiCheckbox
                id={`region-${key}`}
                label={getRegionDisplayName(region)}
                checked={checkedKeys.has(key)}
                onChange={() => onToggleRegion(key)}
                data-test-subj={`manageRegionsCheckbox-${key}`}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </div>
  );
};
