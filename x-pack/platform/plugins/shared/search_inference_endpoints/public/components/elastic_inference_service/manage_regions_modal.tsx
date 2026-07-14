/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UseEuiTheme } from '@elastic/eui';
import { useManageRegionsState } from './use_manage_regions_state';
import { RegionSelectionToolbar } from './region_selection_toolbar';
import { RegionZoneList } from './region_zone_list';

interface ManageRegionsModalProps {
  onClose: () => void;
}

const modalStyles = ({ euiTheme }: UseEuiTheme) => css`
  min-width: ${euiTheme.base * 35}px;
`;

export const ManageRegionsModal: React.FC<ManageRegionsModalProps> = ({ onClose }) => {
  const modalTitleId = useGeneratedHtmlId();
  const {
    zoneGroups,
    checkedKeys,
    expandedZones,
    isCallOutDismissed,
    totalSelected,
    totalRegions,
    allSelected,
    isAllExpanded,
    isLoading,
    isError,
    isSaving,
    isDirty,
    handleDismissCallOut,
    handleSelectAll,
    handleToggleRegion,
    handleToggleZone,
    handleToggleExpand,
    handleExpandAll,
    handleSave,
  } = useManageRegionsState(onClose);

  const showRegionList = !isLoading && totalRegions > 0;
  const showNoRegions = !isLoading && !isError && totalRegions === 0;
  const isSaveDisabled = isSaving || isLoading || totalSelected === 0 || !isDirty;

  return (
    <EuiModal
      css={modalStyles}
      onClose={onClose}
      aria-labelledby={modalTitleId}
      data-test-subj="manageRegionsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.title', {
            defaultMessage: 'Manage region preferences',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {isError && (
          <>
            <EuiCallOut
              announceOnMount={false}
              title={i18n.translate(
                'xpack.searchInferenceEndpoints.manageRegions.errorCallout.title',
                { defaultMessage: 'Failed to load region data' }
              )}
              color="danger"
              iconType="error"
              data-test-subj="manageRegionsErrorCallout"
            >
              <p>
                {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.errorCallout.body', {
                  defaultMessage:
                    'An error occurred while fetching region or policy data. To try again, close and reopen this panel.',
                })}
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.searchInferenceEndpoints.manageRegions.description"
              defaultMessage="You can restrict inference calls to specific regions."
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        {!isCallOutDismissed && (
          <>
            <EuiCallOut
              title={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.callout.title', {
                defaultMessage: "Some models aren't available in every region.",
              })}
              color="primary"
              iconType="info"
              announceOnMount={false}
              onDismiss={handleDismissCallOut}
              data-test-subj="manageRegionsCallout"
            >
              <p>
                {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.callout.body', {
                  defaultMessage:
                    "Some models are only available in specific regions. Restricting regions might make those models unavailable. Check each model's details to verify its supported regions.",
                })}
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        {isLoading && (
          <EuiEmptyPrompt
            icon={<EuiLoadingSpinner size="xl" />}
            data-test-subj="manageRegionsLoading"
          />
        )}

        {showNoRegions && (
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.noRegions.title', {
              defaultMessage: 'No regions available',
            })}
            color="warning"
            iconType="warning"
            data-test-subj="manageRegionsNoRegions"
          >
            <p>
              {i18n.translate(
                'xpack.searchInferenceEndpoints.manageRegions.noRegions.description',
                {
                  defaultMessage:
                    'No region information is available for the current Elastic Inference Service endpoints.',
                }
              )}
            </p>
          </EuiCallOut>
        )}

        {showRegionList && (
          <>
            <RegionSelectionToolbar
              totalSelected={totalSelected}
              totalRegions={totalRegions}
              allSelected={allSelected}
              isAllExpanded={isAllExpanded}
              onSelectAll={handleSelectAll}
              onExpandAll={handleExpandAll}
            />
            <EuiSpacer size="s" />
            <RegionZoneList
              zoneGroups={zoneGroups}
              checkedKeys={checkedKeys}
              expandedZones={expandedZones}
              onToggleRegion={handleToggleRegion}
              onToggleZone={handleToggleZone}
              onToggleExpand={handleToggleExpand}
            />
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onClose}
          isDisabled={isSaving}
          data-test-subj="manageRegionsCancelButton"
        >
          {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>

        <EuiButton
          fill
          onClick={handleSave}
          isDisabled={isSaveDisabled}
          isLoading={isSaving}
          data-test-subj="manageRegionsSaveButton"
        >
          {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.saveButtonLabel', {
            defaultMessage: 'Save preferences',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
