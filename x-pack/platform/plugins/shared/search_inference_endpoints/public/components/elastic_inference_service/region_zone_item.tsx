/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiButtonEmpty, EuiCheckbox, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getRegionDisplayName, regionKey } from '../../utils/eis_utils';
import type { ZoneGroup } from '../../utils/eis_utils';

export interface RegionZoneItemProps {
  zone: ZoneGroup;
  checkedKeys: Set<string>;
  expandedZones: Set<string>;
  onToggleRegion: (key: string) => void;
  onToggleExpand: (zoneId: string, isOpen: boolean) => void;
}

export const RegionZoneItem: React.FC<RegionZoneItemProps> = ({
  zone,
  checkedKeys,
  expandedZones,
  onToggleRegion,
  onToggleExpand,
}) => {
  const zoneKeys = zone.regions.map(regionKey);
  const checkedCount = zoneKeys.filter((k) => checkedKeys.has(k)).length;
  const accordionId = `zone-accordion-${zone.geo}`;
  const isOpen = expandedZones.has(zone.geo);

  const extraAction = (
    <EuiButtonEmpty
      size="s"
      color="text"
      iconType={isOpen ? 'arrowUp' : 'arrowDown'}
      iconSide="right"
      onClick={() => onToggleExpand(zone.geo, !isOpen)}
      aria-expanded={isOpen}
      aria-controls={accordionId}
      data-test-subj={`manageRegionsZoneCountToggle-${zone.geo}`}
    >
      {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.zoneCount', {
        defaultMessage: '{checked} of {total, plural, one {# region} other {# regions}}',
        values: { checked: checkedCount, total: zone.regions.length },
      })}
    </EuiButtonEmpty>
  );

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      data-test-subj={`manageRegionsZone-${zone.geo}`}
    >
      <EuiAccordion
        id={accordionId}
        arrowDisplay="none"
        buttonContent={<strong>{zone.displayName}</strong>}
        buttonProps={{ 'data-test-subj': `manageRegionsZoneToggle-${zone.geo}` }}
        extraAction={extraAction}
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={(nextIsOpen) => onToggleExpand(zone.geo, nextIsOpen)}
        paddingSize="s"
      >
        {zone.regions.map((r) => {
          const key = regionKey(r);
          return (
            <EuiCheckbox
              key={key}
              id={`region-${key}`}
              label={getRegionDisplayName(r)}
              checked={checkedKeys.has(key)}
              onChange={() => onToggleRegion(key)}
              data-test-subj={`manageRegionsCheckbox-${key}`}
            />
          );
        })}
      </EuiAccordion>
    </EuiPanel>
  );
};
