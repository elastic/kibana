/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { regionKey } from '../../utils/eis_utils';
import { useManageRegionsState } from './use_manage_regions_state';
import { ConfirmRegionChangeModal } from './confirm_region_change_modal';
import { ConfirmRegionSelectionModal } from './confirm_region_selection_modal';
import { ConfirmDeleteRegionPolicyModal } from './confirm_delete_region_policy_modal';
import { RestrictTrafficToggle } from './restrict_traffic_toggle';
import { LocationTypeSelector } from './location_type_selector';
import {
  GEO_LOCATION_COPY,
  LocationSelectionList,
  REGIONS_LOCATION_COPY,
  toGeoSelectableOptions,
  toRegionSelectableOptions,
} from './location_selection_list';

interface ManageRegionsModalProps {
  onClose: () => void;
}

export const ManageRegionsModal: React.FC<ManageRegionsModalProps> = ({ onClose }) => {
  const modalTitleId = useGeneratedHtmlId();
  const { common, regionTab, geoTab } = useManageRegionsState(onClose);
  const {
    activeTab,
    isLoading,
    isError,
    isSaving,
    isDeleting,
    isSaveDisabled,
    useCustomPolicy,
    setUseCustomPolicy,
    isCallOutDismissed,
    showConfirmation,
    showDeleteConfirmation,
    conflictArtifacts,
    isRedesignEnabled,
    handleLocationTypeChange,
    handleDismissCallOut,
    handleRequestSave,
    handleConfirmSave,
    handleCancelConfirmation,
    handleConfirmDelete,
    handleCancelDeleteConfirmation,
  } = common;

  const filteredRegions = useMemo(
    () =>
      regionTab.zoneGroups
        .flatMap((z) => z.regions)
        .filter((r) => regionTab.checkedKeys.has(regionKey(r))),
    [regionTab.zoneGroups, regionTab.checkedKeys]
  );

  const isAnyConfirmationOpen = showConfirmation || showDeleteConfirmation;
  const handleAnyCancelConfirmation = showDeleteConfirmation
    ? handleCancelDeleteConfirmation
    : handleCancelConfirmation;

  const showCallOut = useCustomPolicy && !isCallOutDismissed;

  const geoOptions = useMemo(
    () => toGeoSelectableOptions(geoTab.availableGeos, geoTab.checkedGeos),
    [geoTab.availableGeos, geoTab.checkedGeos]
  );
  const regionOptions = useMemo(
    () => toRegionSelectableOptions(regionTab.zoneGroups, regionTab.checkedKeys),
    [regionTab.zoneGroups, regionTab.checkedKeys]
  );

  const locationSelection =
    activeTab === 'geo'
      ? {
        options: geoOptions,
        total: geoTab.totalGeos,
        totalSelected: geoTab.totalGeosSelected,
        allSelected: geoTab.allGeosSelected,
        onSelectAll: geoTab.onSelectAll,
        onToggle: geoTab.onToggleGeo,
        ...GEO_LOCATION_COPY,
      }
      : {
        options: regionOptions,
        total: regionTab.totalRegions,
        totalSelected: regionTab.totalSelected,
        allSelected: regionTab.allSelected,
        onSelectAll: regionTab.onSelectAll,
        onToggle: regionTab.onToggleRegion,
        ...REGIONS_LOCATION_COPY,
      };

  return (
    <>
      <EuiModal
        onClose={isAnyConfirmationOpen ? handleAnyCancelConfirmation : onClose}
        aria-labelledby={modalTitleId}
        data-test-subj="manageRegionsModal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>
            {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.title', {
              defaultMessage: 'Region preferences',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {isError && (
            <KbnDangerCallout
              announceOnMount={false}
              title={i18n.translate(
                'xpack.searchInferenceEndpoints.manageRegions.errorCallout.title',
                { defaultMessage: 'Failed to load region data' }
              )}
              data-test-subj="manageRegionsErrorCallout"
              text={i18n.translate(
                'xpack.searchInferenceEndpoints.manageRegions.errorCallout.body',
                {
                  defaultMessage:
                    'An error occurred while fetching region or policy data. To try again, close and reopen this panel.',
                }
              )}
            />
          )}
          {isError && <EuiSpacer size="m" />}

          <EuiText size="s" data-test-subj="manageRegionsDescription">
            <p>
              <FormattedMessage
                id="xpack.searchInferenceEndpoints.manageRegions.descriptionOff"
                defaultMessage="Restrict inference traffic to the only the geographies or regions you choose. It's recommended to review model availability as not all models are available in all locations."
              />
            </p>
          </EuiText>

          <EuiSpacer size="m" />
          <EuiSplitPanel.Outer
            hasBorder
            hasShadow={false}
            data-test-subj="manageRegionsRestrictPanel"
          >
            <EuiSplitPanel.Inner paddingSize="m">
              <RestrictTrafficToggle
                isRestricted={useCustomPolicy}
                isDisabled={isLoading || isSaving || isDeleting}
                onChange={setUseCustomPolicy}
              />

              {showCallOut && <EuiSpacer size="m" />}
              {showCallOut && (
                <KbnWarningCallout
                  title={i18n.translate(
                    'xpack.searchInferenceEndpoints.manageRegions.callout.title',
                    {
                      defaultMessage:
                        'Review model availability to verify support for selected regions',
                    }
                  )}
                  announceOnMount={false}
                  onDismiss={handleDismissCallOut}
                  dismissButtonProps={{ 'data-test-subj': 'manageRegionsCalloutDismiss' }}
                  size="s"
                  data-test-subj="manageRegionsCallout"
                />
              )}
            </EuiSplitPanel.Inner>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner paddingSize="m" color="subdued">
              {useCustomPolicy ? (
                <>
                  <LocationTypeSelector
                    activeTab={activeTab}
                    isDisabled={isLoading || isSaving || isDeleting}
                    onChange={handleLocationTypeChange}
                  />
                  <EuiSpacer size="s" />
                  <LocationSelectionList
                    isLoading={isLoading}
                    isError={isError}
                    {...locationSelection}
                  />
                </>
              ) : (
                <EuiText size="s">
                  <p>
                    Elastic Inference default policy routes traffic through any available location
                    for best performance.
                  </p>
                </EuiText>
              )}
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty
            onClick={isAnyConfirmationOpen ? handleAnyCancelConfirmation : onClose}
            isDisabled={isSaving || isDeleting}
            data-test-subj="manageRegionsCancelButton"
          >
            {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>

          <EuiButton
            fill
            onClick={handleRequestSave}
            isDisabled={isSaveDisabled}
            isLoading={isSaving || isDeleting}
            data-test-subj="manageRegionsSaveButton"
          >
            {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.saveLabel', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>

      {showConfirmation &&
        (isRedesignEnabled ? (
          <ConfirmRegionSelectionModal
            mode={activeTab}
            selectedRegions={filteredRegions}
            selectedGeos={[...geoTab.checkedGeos]}
            conflictArtifacts={conflictArtifacts}
            onConfirm={handleConfirmSave}
            onCancel={handleCancelConfirmation}
            isSaving={isSaving}
          />
        ) : (
          <ConfirmRegionChangeModal
            mode={activeTab}
            selectedRegions={filteredRegions}
            selectedGeos={[...geoTab.checkedGeos]}
            onConfirm={handleConfirmSave}
            onCancel={handleCancelConfirmation}
            isSaving={isSaving}
          />
        ))}

      {showDeleteConfirmation && (
        <ConfirmDeleteRegionPolicyModal
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDeleteConfirmation}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
};
