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
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import type { UseEuiTheme } from '@elastic/eui';
import { regionKey } from '../../utils/eis_utils';
import { useManageRegionsState } from './use_manage_regions_state';
import { ConfirmRegionChangeModal } from './confirm_region_change_modal';
import { ConfirmRegionSelectionModal } from './confirm_region_selection_modal';
import { ConfirmDeleteRegionPolicyModal } from './confirm_delete_region_policy_modal';
import { ManageRegionsModalBody } from './manage_regions_modal_body';
import { RegionPreferencesBody } from './region_preferences_body';

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
    isError,
    isSaving,
    isDeleting,
    isSaveDisabled,
    showConfirmation,
    showDeleteConfirmation,
    conflictArtifacts,
    isRedesignEnabled,
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
  const showRedesignConfirmation = showConfirmation && isRedesignEnabled;
  const showLegacyConfirmation = showConfirmation && !isRedesignEnabled;

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

          {isRedesignEnabled ? (
            <RegionPreferencesBody state={state} />
          ) : (
            <ManageRegionsModalBody state={state} />
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
            {isRedesignEnabled
              ? i18n.translate('xpack.searchInferenceEndpoints.manageRegions.saveLabel', {
                  defaultMessage: 'Save',
                })
              : i18n.translate('xpack.searchInferenceEndpoints.manageRegions.saveButtonLabel', {
                  defaultMessage: 'Save preferences',
                })}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>

      {showRedesignConfirmation && (
        <ConfirmRegionSelectionModal
          mode={activeTab}
          selectedRegions={filteredRegions}
          selectedGeos={[...geoTab.checkedGeos]}
          conflictArtifacts={conflictArtifacts}
          onConfirm={handleConfirmSave}
          onCancel={handleCancelConfirmation}
          isSaving={isSaving}
        />
      )}
      {showLegacyConfirmation && (
        <ConfirmRegionChangeModal
          mode={activeTab}
          selectedRegions={filteredRegions}
          selectedGeos={[...geoTab.checkedGeos]}
          onConfirm={handleConfirmSave}
          onCancel={handleCancelConfirmation}
          isSaving={isSaving}
        />
      )}

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
