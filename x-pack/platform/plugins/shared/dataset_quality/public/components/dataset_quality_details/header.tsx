/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AppHeader, AppHeaderLoading } from '@kbn/app-header';
import type { DataQualityLocatorParams } from '@kbn/deeplinks-observability';
import { DATA_QUALITY_LOCATOR_ID } from '@kbn/deeplinks-observability';
import React, { useMemo } from 'react';
import { FAILURE_STORE_SELECTOR } from '../../../common/constants';
import { datasetQualityAppTitle, openInDiscoverText } from '../../../common/translations';
import {
  useDatasetDetailsRedirectLinkTelemetry,
  useDatasetDetailsTelemetry,
  useDatasetQualityDetailsState,
  useRedirectLink,
} from '../../hooks';
import { useKibanaContextForPlugin } from '../../utils';
import { IntegrationIcon } from '../common';

export function Header() {
  const {
    services: { share },
  } = useKibanaContextForPlugin();
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
  const integration = integrationDetails?.integration?.integration;

  const listingHref = useMemo(
    () =>
      share.url.locators
        .get<DataQualityLocatorParams>(DATA_QUALITY_LOCATOR_ID)
        ?.getRedirectUrl({}) ?? '',
    [share.url.locators]
  );

  const back = useMemo(
    () =>
      listingHref
        ? {
            href: listingHref,
            label: datasetQualityAppTitle,
          }
        : undefined,
    [listingHref]
  );

  const discoverHref = redirectLinkProps.linkProps.href;

  const menu = useMemo(
    () => ({
      primaryActionItem: {
        id: 'openInDiscover',
        label: openInDiscoverText,
        iconType: 'discoverApp' as const,
        testId: 'datasetQualityDetailsHeaderButton',
        ...(discoverHref ? { href: discoverHref } : {}),
        run: () => {
          redirectLinkProps.navigate();
        },
      },
    }),
    [discoverHref, redirectLinkProps]
  );

  const badges = useMemo(
    () => [
      {
        label: integration?.title ?? pageTitle,
        renderCustomBadge: () => (
          <div
            css={css`
              ${euiShadow};
              padding: ${euiTheme.size.xs};
              border-radius: ${euiTheme.size.xxs};
            `}
          >
            <IntegrationIcon integration={integration} />
          </div>
        ),
      },
    ],
    [euiShadow, euiTheme.size.xs, euiTheme.size.xxs, integration, pageTitle]
  );

  if (!loadingState.integrationDetailsLoaded) {
    return (
      <>
        <AppHeaderLoading spacing="bleed" back={back} menu={{ buttonCount: 0, hasPrimary: true }} />
        <EuiSpacer size="l" />
      </>
    );
  }

  return (
    <>
      <AppHeader
        title={pageTitle}
        description={rawName}
        back={back}
        badges={badges}
        menu={menu}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
    </>
  );
}
