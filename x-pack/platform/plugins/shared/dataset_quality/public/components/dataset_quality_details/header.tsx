/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { FAILURE_STORE_SELECTOR } from '../../../common/constants';
import { openInDiscoverText } from '../../../common/translations';
import {
  useDatasetDetailsRedirectLinkTelemetry,
  useDatasetDetailsTelemetry,
  useDatasetQualityDetailsState,
  useRedirectLink,
} from '../../hooks';
import { IntegrationIcon } from '../common';

export function Header() {
  const { datasetDetails, timeRange, integrationDetails, loadingState } =
    useDatasetQualityDetailsState();

  const { navigationSources } = useDatasetDetailsTelemetry();

  const { rawName, name: title } = datasetDetails;
  const euiShadow = useEuiShadow('s');
  const { euiTheme } = useEuiTheme();
  const { sendTelemetry } = useDatasetDetailsRedirectLinkTelemetry({
    navigationSource: navigationSources.Header,
  });
  const redirectLinkProps = useRedirectLink({
    dataStreamStat: `${datasetDetails.rawName},${datasetDetails.rawName}${FAILURE_STORE_SELECTOR}`,
    timeRangeConfig: timeRange,
    sendTelemetry,
  });

  const pageTitle =
    integrationDetails?.integration?.integration?.datasets?.[datasetDetails.name] ?? title;

  return !loadingState.integrationDetailsLoaded ? (
    <>
      <EuiSkeletonTitle
        size="l"
        data-test-subj="datasetQualityDetailsIntegrationLoading"
        className="datasetQualityDetailsIntegrationLoading"
      />
      <EuiSpacer size="s" />
      <EuiSkeletonText lines={1} />
    </>
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
          <EuiButton
            data-test-subj="datasetQualityDetailsHeaderButton"
            size="s"
            {...redirectLinkProps.linkProps}
            iconType="discoverApp"
          >
            {openInDiscoverText}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
