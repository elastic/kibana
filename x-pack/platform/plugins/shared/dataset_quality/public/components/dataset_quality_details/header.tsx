/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSkeletonTitle,
  EuiTextColor,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { DEGRADED_DOCS_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { createAlertText, openInDiscoverText } from '../../../common/translations';
import { AlertFlyout } from '../../alerts/alert_flyout';
import { getAlertingCapabilities } from '../../alerts/get_alerting_capabilities';
import {
  useDatasetDetailsRedirectLinkTelemetry,
  useDatasetDetailsTelemetry,
  useDatasetQualityDetailsState,
  useRedirectLink,
} from '../../hooks';
import { useKibanaContextForPlugin } from '../../utils';
import { IntegrationIcon } from '../common';

export function Header() {
  const { datasetDetails, timeRange, integrationDetails, loadingState } =
    useDatasetQualityDetailsState();

  const {
    services: { application, alerting },
  } = useKibanaContextForPlugin();
  const { capabilities } = application;

  const { navigationSources } = useDatasetDetailsTelemetry();

  const { rawName, name: title } = datasetDetails;
  const euiShadow = useEuiShadow('s');
  const { euiTheme } = useEuiTheme();
  const { sendTelemetry } = useDatasetDetailsRedirectLinkTelemetry({
    navigationSource: navigationSources.Header,
  });
  const redirectLinkProps = useRedirectLink({
    dataStreamStat: datasetDetails,
    timeRangeConfig: timeRange,
    sendTelemetry,
  });

  const { isAlertingAvailable } = getAlertingCapabilities(alerting, capabilities);

  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [ruleType, setRuleType] = useState<typeof DEGRADED_DOCS_RULE_TYPE_ID | null>(null);

  const pageTitle =
    integrationDetails?.integration?.integration?.datasets?.[datasetDetails.name] ?? title;

  const createMenuItems = [
    {
      name: createAlertText,
      icon: 'bell',
      onClick: () => {
        setShowPopover(false);
        setRuleType(DEGRADED_DOCS_RULE_TYPE_ID);
      },
      'data-test-subj': `createAlert`,
    },
    {
      name: openInDiscoverText,
      icon: 'discoverApp',
      ...redirectLinkProps.linkProps,
      'data-test-subj': `openInDiscover`,
    },
  ];
  const titleActionButtons = [
    <EuiPopover
      key="actionsPopover"
      isOpen={showPopover}
      closePopover={() => setShowPopover(false)}
      button={
        <EuiButton
          iconSide="right"
          iconType="arrowDown"
          data-test-subj="datasetQualityDetailsActionsDropdown"
          key="actionsDropdown"
          onClick={() => setShowPopover((prev) => !prev)}
        >
          {i18n.translate('xpack.datasetQuality.ActionsLabel', {
            defaultMessage: 'Actions',
          })}
        </EuiButton>
      }
      panelPaddingSize="none"
      repositionOnScroll
    >
      <EuiContextMenu
        initialPanelId={0}
        data-test-subj="autoFollowPatternActionContextMenu"
        panels={[
          {
            id: 0,
            items: createMenuItems,
          },
        ]}
      />
    </EuiPopover>,
  ];

  return !loadingState.integrationDetailsLoaded ? (
    <EuiSkeletonTitle
      size="s"
      data-test-subj="datasetQualityDetailsIntegrationLoading"
      className="datasetQualityDetailsIntegrationLoading"
    />
  ) : (
    <EuiFlexGroup justifyContent="flexStart">
      <EuiFlexItem grow>
        <EuiFlexGroup gutterSize="m" alignItems="flexStart" direction="column">
          <EuiFlexGroup gutterSize="m" justifyContent="flexStart" alignItems="center">
            <EuiTitle data-test-subj="datasetQualityDetailsTitle" size="l">
              <h2>{pageTitle}</h2>
            </EuiTitle>
            <div
              css={css`
                ${euiShadow};
                padding: ${euiTheme.size.xs};
                border-radius: ${euiTheme.size.xxs};
              `}
            >
              <IntegrationIcon integration={integrationDetails?.integration?.integration} />
            </div>
          </EuiFlexGroup>
          <p>
            <EuiTextColor color="subdued">{rawName}</EuiTextColor>
          </p>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          css={css`
            margin-right: ${euiTheme.size.l};
          `}
          gutterSize="s"
          justifyContent="flexEnd"
          alignItems="center"
        >
          {isAlertingAvailable ? (
            titleActionButtons
          ) : (
            <EuiButton
              data-test-subj="datasetQualityDetailsHeaderButton"
              size="s"
              {...redirectLinkProps.linkProps}
              iconType="discoverApp"
            >
              {openInDiscoverText}
            </EuiButton>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <AlertFlyout
        dataStream={rawName}
        addFlyoutVisible={!!ruleType}
        setAddFlyoutVisibility={(visible) => {
          if (!visible) {
            setRuleType(null);
          }
        }}
      />
    </EuiFlexGroup>
  );
}
