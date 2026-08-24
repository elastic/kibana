/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RestrictTrafficToggle } from './restrict_traffic_toggle';
import { LocationTypeSelector } from './location_type_selector';
import { GeoLocationList } from './geo_location_list';
import { RegionLocationList } from './region_location_list';
import { RegionSelectionToolbar } from './region_selection_toolbar';
import type { ManageRegionsState } from './use_manage_regions_state';

interface RegionPreferencesBodyProps {
  state: ManageRegionsState;
}

export const RegionPreferencesBody: React.FC<RegionPreferencesBodyProps> = ({ state }) => {
  const { common, regionTab, geoTab } = state;
  const {
    activeTab,
    isLoading,
    isError,
    isSaving,
    isDeleting,
    useCustomPolicy,
    setUseCustomPolicy,
    handleLocationTypeChange,
  } = common;

  // Show the selection area while loading so the spinner renders in the right slot,
  // and to avoid a frame-1 → frame-2 flash for users who already have a policy.
  const showLocationSelection = useCustomPolicy || isLoading;

  const description = useCustomPolicy ? (
    <FormattedMessage
      id="xpack.searchInferenceEndpoints.manageRegions.descriptionOn"
      defaultMessage="Elastic's default policy routes traffic to any available location for best performance. Set a custom policy to restrict it to the geographies or regions you choose."
    />
  ) : (
    <FormattedMessage
      id="xpack.searchInferenceEndpoints.manageRegions.descriptionOff"
      defaultMessage="Set a custom policy to restrict inference traffic to the geographies or regions you choose."
    />
  );

  const renderGeoContent = () => {
    if (isLoading) {
      return (
        <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} data-test-subj="manageGeosLoading" />
      );
    }
    if (geoTab.totalGeos === 0) {
      if (isError) return null;
      return (
        <KbnWarningCallout
          announceOnMount
          title={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.noGeos.title', {
            defaultMessage: 'No geographies available',
          })}
          data-test-subj="manageRegionsNoGeos"
          text={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.noGeos.description', {
            defaultMessage:
              'No geographic zone information is available for the current Elastic Inference Service endpoints.',
          })}
        />
      );
    }
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <RegionSelectionToolbar
          totalSelected={geoTab.totalGeosSelected}
          totalRegions={geoTab.totalGeos}
          allSelected={geoTab.allGeosSelected}
          onSelectAll={geoTab.onSelectAll}
        />
        <GeoLocationList
          availableGeos={geoTab.availableGeos}
          checkedGeos={geoTab.checkedGeos}
          onToggleGeo={geoTab.onToggleGeo}
        />
      </EuiFlexGroup>
    );
  };

  const renderRegionContent = () => {
    if (isLoading) {
      return (
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          data-test-subj="manageRegionsLoading"
        />
      );
    }
    if (regionTab.totalRegions === 0) {
      if (isError) return null;
      return (
        <KbnWarningCallout
          announceOnMount
          title={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.noRegions.title', {
            defaultMessage: 'No regions available',
          })}
          data-test-subj="manageRegionsNoRegions"
          text={i18n.translate(
            'xpack.searchInferenceEndpoints.manageRegions.noRegions.description',
            {
              defaultMessage:
                'No region information is available for the current Elastic Inference Service endpoints.',
            }
          )}
        />
      );
    }
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <RegionSelectionToolbar
          totalSelected={regionTab.totalSelected}
          totalRegions={regionTab.totalRegions}
          allSelected={regionTab.allSelected}
          onSelectAll={regionTab.onSelectAll}
        />
        <RegionLocationList
          zoneGroups={regionTab.zoneGroups}
          checkedKeys={regionTab.checkedKeys}
          onToggleRegion={regionTab.onToggleRegion}
        />
      </EuiFlexGroup>
    );
  };

  return (
    <>
      <EuiText size="s" data-test-subj="manageRegionsDescription">
        <p>{description}</p>
      </EuiText>

      <EuiSpacer size="m" />

      <RestrictTrafficToggle
        isRestricted={useCustomPolicy}
        isDisabled={isLoading || isSaving || isDeleting}
        onChange={setUseCustomPolicy}
      />

      {showLocationSelection && <EuiSpacer size="m" />}
      {showLocationSelection && <EuiHorizontalRule margin="none" />}

      {showLocationSelection && <EuiSpacer size="m" />}
      {showLocationSelection && (
        <LocationTypeSelector
          activeTab={activeTab}
          isDisabled={isLoading || isSaving || isDeleting}
          onChange={handleLocationTypeChange}
        />
      )}

      {showLocationSelection && <EuiSpacer size="m" />}
      {showLocationSelection && (activeTab === 'geo' ? renderGeoContent() : renderRegionContent())}
    </>
  );
};
