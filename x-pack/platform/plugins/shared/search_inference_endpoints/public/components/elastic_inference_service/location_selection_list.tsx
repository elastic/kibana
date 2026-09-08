/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiPanel, EuiSelectable, type EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getGeoDisplayName, getRegionDisplayName, regionKey } from '../../utils/eis_utils';
import type { ZoneGroup } from '../../utils/eis_utils';
import { RegionSelectionToolbar } from './region_selection_toolbar';

export const GEO_LOCATION_COPY = {
  ariaLabel: i18n.translate('xpack.searchInferenceEndpoints.manageRegions.geoSelectableAriaLabel', {
    defaultMessage: 'Geographic zones',
  }),
  emptyMessage: i18n.translate('xpack.searchInferenceEndpoints.manageRegions.noGeos.title', {
    defaultMessage: 'No geographies available',
  }),
  errorMessage: i18n.translate('xpack.searchInferenceEndpoints.manageRegions.noGeos.errorMessage', {
    defaultMessage: 'Failed to load geographic zones',
  }),
  emptyTestSubj: 'manageRegionsNoGeos',
  loadingTestSubj: 'manageGeosLoading',
  listTestSubj: 'manageRegionsGeoList',
};

export const REGIONS_LOCATION_COPY = {
  ariaLabel: i18n.translate(
    'xpack.searchInferenceEndpoints.manageRegions.regionsSelectableAriaLabel',
    { defaultMessage: 'Regions' }
  ),
  emptyMessage: i18n.translate('xpack.searchInferenceEndpoints.manageRegions.noRegions.title', {
    defaultMessage: 'No regions available',
  }),
  errorMessage: i18n.translate(
    'xpack.searchInferenceEndpoints.manageRegions.noRegions.errorMessage',
    { defaultMessage: 'Failed to load regions' }
  ),
  emptyTestSubj: 'manageRegionsNoRegions',
  loadingTestSubj: 'manageRegionsLoading',
  listTestSubj: 'manageRegionsRegionList',
};

export const toGeoSelectableOptions = (
  availableGeos: string[],
  checkedGeos: Set<string>
): EuiSelectableOption[] =>
  availableGeos.map((geo) => ({
    key: geo,
    label: getGeoDisplayName(geo),
    checked: checkedGeos.has(geo) ? ('on' as const) : undefined,
    'data-test-subj': `geoZoneCheckbox-${geo}`,
  }));

export const toRegionSelectableOptions = (
  zoneGroups: ZoneGroup[],
  checkedKeys: Set<string>
): EuiSelectableOption[] =>
  zoneGroups.flatMap((zone) => [
    {
      label: zone.displayName,
      isGroupLabel: true,
      'data-test-subj': `manageRegionsZone-${zone.geo}`,
    },
    ...zone.regions.map((region) => {
      const key = regionKey(region);
      return {
        key,
        label: getRegionDisplayName(region),
        checked: checkedKeys.has(key) ? ('on' as const) : undefined,
        'data-test-subj': `manageRegionsCheckbox-${key}`,
      };
    }),
  ]);

export interface LocationSelectionListProps {
  isLoading: boolean;
  isError: boolean;
  options: EuiSelectableOption[];
  total: number;
  totalSelected: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onToggle: (key: string) => void;
  ariaLabel: string;
  emptyMessage: string;
  errorMessage: string;
  emptyTestSubj: string;
  loadingTestSubj: string;
  listTestSubj: string;
}

export const LocationSelectionList: React.FC<LocationSelectionListProps> = ({
  isLoading,
  isError,
  options,
  total,
  totalSelected,
  allSelected,
  onSelectAll,
  onToggle,
  ariaLabel,
  emptyMessage,
  errorMessage,
  emptyTestSubj,
  loadingTestSubj,
  listTestSubj,
}) => {
  const handleChange = useCallback(
    (_options: EuiSelectableOption[], _event: unknown, changedOption: EuiSelectableOption) => {
      if (changedOption.key) {
        onToggle(changedOption.key);
      }
    },
    [onToggle]
  );

  const hasItems = !isLoading && !isError && total > 0;
  const selectableTestSubj = isLoading
    ? loadingTestSubj
    : total === 0 && !isError
    ? emptyTestSubj
    : listTestSubj;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {hasItems && (
        <RegionSelectionToolbar
          totalSelected={totalSelected}
          totalRegions={total}
          allSelected={allSelected}
          onSelectAll={onSelectAll}
        />
      )}
      <EuiPanel paddingSize="s" hasBorder color="plain">
        <EuiSelectable
          aria-label={ariaLabel}
          options={total === 0 ? [] : options}
          onChange={handleChange}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          errorMessage={isError ? errorMessage : undefined}
          listProps={{
            bordered: false,
            isVirtualized: false,
          }}
          data-test-subj={selectableTestSubj}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiPanel>
    </EuiFlexGroup>
  );
};
