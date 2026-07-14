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
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UseEuiTheme } from '@elastic/eui';
import { regionKey, isPolicyMode } from '../../utils/eis_utils';
import { useManageRegionsState } from './use_manage_regions_state';
import { ConfirmRegionChangeModal } from './confirm_region_change_modal';
import { GeoTabContent } from './geo_tab_content';
import { RegionsTabContent } from './regions_tab_content';

interface ManageRegionsModalProps {
  onClose: () => void;
}

const modalStyles = ({ euiTheme }: UseEuiTheme) => css`
  min-width: ${euiTheme.base * 35}px;
`;

export const ManageRegionsModal: React.FC<ManageRegionsModalProps> = ({ onClose }) => {
  const modalTitleId = useGeneratedHtmlId();
  const { common, regionTab, geoTab } = useManageRegionsState(onClose);
  const {
    activeTab,
    isLoading,
    isError,
    isSaving,
    isSaveDisabled,
    isCallOutDismissed,
    showConfirmation,
    setActiveTab,
    handleDismissCallOut,
    handleRequestSave,
    handleConfirmSave,
    handleCancelConfirmation,
  } = common;

  const filteredRegions = useMemo(
    () =>
      regionTab.zoneGroups
        .flatMap((z) => z.regions)
        .filter((r) => regionTab.checkedKeys.has(regionKey(r))),
    [regionTab.zoneGroups, regionTab.checkedKeys]
  );

  const tabs = useMemo(
    () => [
      {
        id: 'geo',
        name: i18n.translate('xpack.searchInferenceEndpoints.manageRegions.geoTab', {
          defaultMessage: 'Geographies',
        }),
        'data-test-subj': 'manageRegionsGeoTab',
        content: <GeoTabContent isLoading={isLoading} isError={isError} geoTab={geoTab} />,
      },
      {
        id: 'regions',
        name: i18n.translate('xpack.searchInferenceEndpoints.manageRegions.regionsTab', {
          defaultMessage: 'Regions',
        }),
        'data-test-subj': 'manageRegionsRegionsTab',
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
        onClose={showConfirmation ? handleCancelConfirmation : onClose}
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
          )}
          {isError && <EuiSpacer size="m" />}

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
          )}
          {!isCallOutDismissed && <EuiSpacer size="m" />}

          <EuiTabbedContent
            tabs={tabs}
            selectedTab={selectedTab}
            onTabClick={(tab) => isPolicyMode(tab.id) && setActiveTab(tab.id)}
          />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty
            onClick={showConfirmation ? handleCancelConfirmation : onClose}
            isDisabled={isSaving}
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
            isLoading={isSaving}
            data-test-subj="manageRegionsSaveButton"
          >
            {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.saveButtonLabel', {
              defaultMessage: 'Save preferences',
            })}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>

      {showConfirmation && (
        <ConfirmRegionChangeModal
          mode={activeTab}
          selectedRegions={filteredRegions}
          selectedGeos={[...geoTab.checkedGeos]}
          onConfirm={handleConfirmSave}
          onCancel={handleCancelConfirmation}
          isSaving={isSaving}
        />
      )}
    </>
  );
};
