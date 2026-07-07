/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CspRegion } from '../../../common/types';
import { regionKey } from '../../utils/eis_utils';
import { REGION_DISPLAY_NAMES } from '../../../common/constants';

export interface ZoneGroup {
  geo: string;
  displayName: string;
  regions: CspRegion[];
}

interface RegionZoneListProps {
  zoneGroups: ZoneGroup[];
  checkedKeys: Set<string>;
  expandedZones: Set<string>;
  onToggleRegion: (key: string) => void;
  onToggleZone: (zone: ZoneGroup) => void;
  onToggleExpand: (zoneId: string, isOpen: boolean) => void;
}

export const RegionZoneList: React.FC<RegionZoneListProps> = ({
  zoneGroups,
  checkedKeys,
  expandedZones,
  onToggleRegion,
  onToggleZone,
  onToggleExpand,
}) => {
  const { euiTheme } = useEuiTheme();
  const regionListStyles = css({ padding: euiTheme.size.s });
  const zoneCheckboxStyles = css({ marginTop: euiTheme.size.xs });

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {zoneGroups.map((zone) => {
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
            key={zone.geo}
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
                  paddingSize="none"
                >
                  <EuiFlexGroup direction="column" gutterSize="s" css={regionListStyles}>
                    {zone.regions.map((r) => {
                      const key = regionKey(r);
                      return (
                        <EuiFlexItem key={key} grow={false}>
                          <EuiCheckbox
                            id={`region-${key}`}
                            label={REGION_DISPLAY_NAMES[key] ?? r.region}
                            checked={checkedKeys.has(key)}
                            onChange={() => onToggleRegion(key)}
                            data-test-subj={`manageRegionsCheckbox-${key}`}
                          />
                        </EuiFlexItem>
                      );
                    })}
                  </EuiFlexGroup>
                </EuiAccordion>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        );
      })}
    </EuiFlexGroup>
  );
};
