/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
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
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UseEuiTheme } from '@elastic/eui';
import { regionKey } from '../../utils/eis_utils';
import { useManageRegionsState } from './use_manage_regions_state';
import { ConfirmRegionChangeModal } from './confirm_region_change_modal';
import { ConfirmRegionSelectionModal } from './confirm_region_selection_modal';
import { ConfirmDeleteRegionPolicyModal } from './confirm_delete_region_policy_modal';
import { RestrictTrafficToggle } from './restrict_traffic_toggle';
import { LocationTypeSelector } from './location_type_selector';
import { GeoTabContent } from './geo_tab_content';
import { RegionsTabContent } from './regions_tab_content';

interface ManageRegionsModalProps {
  onClose: () => void;
}

const modalStyles = ({ euiTheme }: UseEuiTheme) => css`
  min-width: ${euiTheme.base * 45}px;
`;

export const ManageRegionsModal: React.FC<ManageRegionsModalProps> = ({ onClose }) => {
  const modalTitleId = useGeneratedHtmlId();
  const state = useManageRegionsState(onClose);
  const { common, regionTab, geoTab } = state;
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

  const showTabContent = useCustomPolicy || isLoading;
  const showCallOut = useCustomPolicy && !isCallOutDismissed;

  const tabs = useMemo(
    () => [
      {
        id: 'geo' as const,
        content: <GeoTabContent isLoading={isLoading} isError={isError} geoTab={geoTab} />,
      },
      {
        id: 'regions' as const,
        content: (
          <RegionsTabContent isLoading={isLoading} isError={isError} regionTab={regionTab} />
        ),
      },
    ],
    [isLoading, isError, geoTab, regionTab]
  );

  const selectedTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTab) ?? tabs[0],
    [tabs, activeTab]
  );

  return (
    <>
      <EuiModal
        css={modalStyles}
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
              {useCustomPolicy ? (
                <FormattedMessage
                  id="xpack.searchInferenceEndpoints.manageRegions.descriptionOn"
                  defaultMessage="Elastic's default policy routes traffic to any available location for best performance. Set a custom policy to restrict it to the geographies or regions you choose."
                />
              ) : (
                <FormattedMessage
                  id="xpack.searchInferenceEndpoints.manageRegions.descriptionOff"
                  defaultMessage="Set a custom policy to restrict inference traffic to the geographies or regions you choose."
                />
              )}
            </p>
          </EuiText>

          <EuiSpacer size="m" />

          <RestrictTrafficToggle
            isRestricted={useCustomPolicy}
            isDisabled={isLoading || isSaving || isDeleting}
            onChange={setUseCustomPolicy}
          />

          {showCallOut && <EuiSpacer size="m" />}
          {showCallOut && (
            <KbnWarningCallout
              title={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.callout.title', {
                defaultMessage: "Some models aren't available in every region.",
              })}
              announceOnMount={false}
              onDismiss={handleDismissCallOut}
              dismissButtonProps={{ 'data-test-subj': 'manageRegionsCalloutDismiss' }}
              data-test-subj="manageRegionsCallout"
              text={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.callout.body', {
                defaultMessage:
                  "Some models are only available in specific regions. Restricting regions might make those models unavailable. Check each model's details to verify its supported regions.",
              })}
            />
          )}

          {showTabContent && (
            <>
              <EuiSpacer size="m" />
              <EuiHorizontalRule margin="none" />
              <EuiSpacer size="m" />
              <LocationTypeSelector
                activeTab={activeTab}
                isDisabled={isLoading || isSaving || isDeleting}
                onChange={handleLocationTypeChange}
              />
              <EuiSpacer size="m" />
              {selectedTab.content}
            </>
          )}
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
