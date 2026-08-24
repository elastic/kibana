/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer, EuiSwitch, EuiTabbedContent, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isPolicyMode } from '../../utils/eis_utils';
import { GeoTabContent } from './geo_tab_content';
import { RegionsTabContent } from './regions_tab_content';
import type { ManageRegionsState } from './use_manage_regions_state';

interface ManageRegionsModalBodyProps {
  state: ManageRegionsState;
}

export const ManageRegionsModalBody: React.FC<ManageRegionsModalBodyProps> = ({ state }) => {
  const { common, regionTab, geoTab } = state;
  const {
    activeTab,
    isLoading,
    isError,
    isSaving,
    isDeleting,
    useCustomPolicy,
    isCallOutDismissed,
    setActiveTab,
    setUseCustomPolicy,
    handleDismissCallOut,
  } = common;

  const customPolicyToggleId = useGeneratedHtmlId({ prefix: 'manageRegionsCustomPolicyToggle' });

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

  const showTabContent = useCustomPolicy || isLoading;
  const showCallOut = useCustomPolicy && !isCallOutDismissed;

  return (
    <>
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.searchInferenceEndpoints.manageRegions.description"
            defaultMessage="Choose which locations can receive inference traffic: by geography or by region."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiSwitch
        id={customPolicyToggleId}
        checked={useCustomPolicy}
        onChange={(e) => setUseCustomPolicy(e.target.checked)}
        disabled={isLoading || isSaving || isDeleting}
        label={i18n.translate(
          'xpack.searchInferenceEndpoints.manageRegions.customPolicyToggleLabel',
          { defaultMessage: 'Restrict inference to specific locations' }
        )}
        data-test-subj="manageRegionsCustomPolicyToggle"
      />

      {/* Spacers are separate conditional siblings to prevent the modal from
          resizing when the callout is dismissed (commit ed4966aade37). */}
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

      {showTabContent && <EuiSpacer size="m" />}
      {showTabContent && (
        <EuiTabbedContent
          tabs={tabs}
          selectedTab={selectedTab}
          onTabClick={(tab) => isPolicyMode(tab.id) && setActiveTab(tab.id)}
        />
      )}
    </>
  );
};
