/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UseEuiTheme } from '@elastic/eui';
import type { CspRegion } from '../../../common/types';
import { regionKey, REGION_DISPLAY_NAMES } from '../../utils/eis_utils';

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
  onToggleExpand: (zoneId: string) => void;
}

const zoneRowStyles = ({ euiTheme }: UseEuiTheme) => css`
  padding: ${euiTheme.size.s} ${euiTheme.size.s};
  border: ${euiTheme.border.thin};
  border-radius: ${euiTheme.border.radius.medium};
  margin-bottom: ${euiTheme.size.xs};
`;

const regionRowStyles = ({ euiTheme }: UseEuiTheme) => css`
  padding: ${euiTheme.size.xs} 0;
`;

const regionListStyles = ({ euiTheme }: UseEuiTheme) => css`
  padding: ${euiTheme.size.s} ${euiTheme.size.xl};
  border-top: ${euiTheme.border.thin};
`;

export const RegionZoneList: React.FC<RegionZoneListProps> = ({
  zoneGroups,
  checkedKeys,
  expandedZones,
  onToggleRegion,
  onToggleZone,
  onToggleExpand,
}) => {
  return (
    <>
      {zoneGroups.map((zone) => {
        const zoneKeys = zone.regions.map(regionKey);
        const checkedCount = zoneKeys.filter((k) => checkedKeys.has(k)).length;
        const isZoneChecked = checkedCount === zone.regions.length;
        const isZoneIndeterminate = checkedCount > 0 && checkedCount < zone.regions.length;
        const isExpanded = expandedZones.has(zone.geo);
        const zoneCheckboxId = `zone-checkbox-${zone.geo}`;

        return (
          <div key={zone.geo} data-test-subj={`manageRegionsZone-${zone.geo}`}>
            <div css={zoneRowStyles}>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiCheckbox
                    id={zoneCheckboxId}
                    checked={isZoneChecked}
                    indeterminate={isZoneIndeterminate}
                    onChange={() => onToggleZone(zone)}
                    label={<strong>{zone.displayName}</strong>}
                    data-test-subj={`manageRegionsZoneCheckbox-${zone.geo}`}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" color="subdued">
                        {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.zoneCount', {
                          defaultMessage:
                            '{checked} of {total, plural, one {# region} other {# regions}}',
                          values: {
                            checked: checkedCount,
                            total: zone.regions.length,
                          },
                        })}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={
                          isExpanded
                            ? i18n.translate(
                                'xpack.searchInferenceEndpoints.manageRegions.collapseZone',
                                {
                                  defaultMessage: 'Collapse {zone}',
                                  values: { zone: zone.displayName },
                                }
                              )
                            : i18n.translate(
                                'xpack.searchInferenceEndpoints.manageRegions.expandZone',
                                {
                                  defaultMessage: 'Expand {zone}',
                                  values: { zone: zone.displayName },
                                }
                              )
                        }
                        disableScreenReaderOutput
                      >
                        <EuiButtonIcon
                          iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
                          onClick={() => onToggleExpand(zone.geo)}
                          aria-label={
                            isExpanded
                              ? i18n.translate(
                                  'xpack.searchInferenceEndpoints.manageRegions.collapseZone',
                                  {
                                    defaultMessage: 'Collapse {zone}',
                                    values: { zone: zone.displayName },
                                  }
                                )
                              : i18n.translate(
                                  'xpack.searchInferenceEndpoints.manageRegions.expandZone',
                                  {
                                    defaultMessage: 'Expand {zone}',
                                    values: { zone: zone.displayName },
                                  }
                                )
                          }
                          data-test-subj={`manageRegionsZoneToggle-${zone.geo}`}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>

              {isExpanded && (
                <div css={regionListStyles}>
                  {zone.regions.map((r) => {
                    const key = regionKey(r);
                    const displayName = REGION_DISPLAY_NAMES[key] ?? r.region;
                    return (
                      <div key={key} css={regionRowStyles}>
                        <EuiCheckbox
                          id={`region-${key}`}
                          label={displayName}
                          checked={checkedKeys.has(key)}
                          onChange={() => onToggleRegion(key)}
                          data-test-subj={`manageRegionsCheckbox-${key}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};
