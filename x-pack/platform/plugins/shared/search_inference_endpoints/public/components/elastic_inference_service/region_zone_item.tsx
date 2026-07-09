/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiAccordion,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { regionKey } from '../../utils/eis_utils';
import { REGION_DISPLAY_NAMES } from '../../../common/constants';
import type { ZoneGroup } from './region_zone_list';

export interface RegionZoneItemProps {
  zone: ZoneGroup;
  checkedKeys: Set<string>;
  expandedZones: Set<string>;
  onToggleRegion: (key: string) => void;
  onToggleZone: (zone: ZoneGroup) => void;
  onToggleExpand: (zoneId: string, isOpen: boolean) => void;
}

const zoneCheckboxStyles = ({ euiTheme }: UseEuiTheme) => ({
  marginTop: euiTheme.size.xs,
});

export const RegionZoneItem: React.FC<RegionZoneItemProps> = ({
  zone,
  checkedKeys,
  expandedZones,
  onToggleRegion,
  onToggleZone,
  onToggleExpand,
}) => {
  const zoneKeys = zone.regions.map(regionKey);
  const checkedCount = zoneKeys.filter((k) => checkedKeys.has(k)).length;
  const isZoneChecked = checkedCount === zone.regions.length;
  const isZoneIndeterminate = checkedCount > 0 && checkedCount < zone.regions.length;

  const extraAction = (
    <EuiText size="s" color="subdued">
      {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.zoneCount', {
        defaultMessage: '{checked} of {total, plural, one {# region} other {# regions}}',
        values: { checked: checkedCount, total: zone.regions.length },
      })}
    </EuiText>
  );

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      data-test-subj={`manageRegionsZone-${zone.geo}`}
    >
      <EuiFlexGroup alignItems="flexStart" gutterSize="s">
        <EuiFlexItem grow={false} css={zoneCheckboxStyles}>
          <EuiCheckbox
            id={`zone-checkbox-${zone.geo}`}
            checked={isZoneChecked}
            indeterminate={isZoneIndeterminate}
            onChange={() => onToggleZone(zone)}
            label=""
            aria-label={i18n.translate(
              'xpack.searchInferenceEndpoints.manageRegions.zoneCheckboxAriaLabel',
              {
                defaultMessage: 'Toggle all regions in {zone}',
                values: { zone: zone.displayName },
              }
            )}
            data-test-subj={`manageRegionsZoneCheckbox-${zone.geo}`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiAccordion
            id={`zone-accordion-${zone.geo}`}
            arrowDisplay="right"
            buttonContent={<strong>{zone.displayName}</strong>}
            buttonProps={{ 'data-test-subj': `manageRegionsZoneToggle-${zone.geo}` }}
            extraAction={extraAction}
            forceState={expandedZones.has(zone.geo) ? 'open' : 'closed'}
            onToggle={(isOpen) => onToggleExpand(zone.geo, isOpen)}
            paddingSize="s"
          >
            {zone.regions.map((r) => {
              const key = regionKey(r);
              return (
                <EuiCheckbox
                  key={key}
                  id={`region-${key}`}
                  label={`${REGION_DISPLAY_NAMES[key] ?? r.region} - ${r.csp.toUpperCase()}`}
                  checked={checkedKeys.has(key)}
                  onChange={() => onToggleRegion(key)}
                  data-test-subj={`manageRegionsCheckbox-${key}`}
                />
              );
            })}
          </EuiAccordion>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
