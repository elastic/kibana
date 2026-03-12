/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  DEFERRED_ASSETS_WARNING_LABEL,
  DEFERRED_ASSETS_WARNING_MSG,
} from '../screens/detail/assets/deferred_assets_warning';

import { CardIcon } from '../../../../../components/package_icon';
import type { IntegrationCardItem } from '../screens/home';

import { InlineReleaseBadge } from '../../../components';
import { useStartServices } from '../../../hooks';
import { INTEGRATIONS_BASE_PATH, INTEGRATIONS_PLUGIN_ID } from '../../../constants';

import {
  InstallationStatus,
  getLineClampStyles,
  shouldShowInstallationStatus,
} from './installation_status';
import { wrapTitleWithDeprecated } from './utils';

export type PackageCardProps = IntegrationCardItem;

export function PackageCard({
  description,
  name,
  title,
  version,
  type,
  icons,
  integration,
  url,
  release,
  id,
  fromIntegrations,
  isReauthorizationRequired,
  isUnverified,
  isUpdateAvailable,
  isDeprecated,
  showLabels = true,
  showInstallationStatus,
  showCompressedInstallationStatus,
  extraLabelsBadges,
  isQuickstart = false,
  installStatus,
  onCardClick: onClickProp = undefined,
  isCollectionCard = false,
  titleLineClamp,
  titleBadge,
  titleSize = 'xs',
  descriptionLineClamp = 2,
  maxCardHeight,
  minCardHeight,
  showDescription = true,
  showReleaseBadge = true,
  hasDataStreams,
}: PackageCardProps) {
  const theme = useEuiTheme();
  let releaseBadge: React.ReactNode | null = null;
  if (release && release !== 'ga' && showReleaseBadge) {
    releaseBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <InlineReleaseBadge release={release} />
        </span>
      </EuiFlexItem>
    );
  }

  let verifiedBadge: React.ReactNode | null = null;
  if (isUnverified && showLabels) {
    verifiedBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiBadge color="warning">
            <FormattedMessage
              id="xpack.fleet.packageCard.unverifiedLabel"
              defaultMessage="Unverified"
            />
          </EuiBadge>
        </span>
      </EuiFlexItem>
    );
  }

  let hasDeferredInstallationsBadge: React.ReactNode | null = null;
  if (isReauthorizationRequired && showLabels) {
    hasDeferredInstallationsBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiToolTip
            display="inlineBlock"
            content={DEFERRED_ASSETS_WARNING_MSG}
            title={DEFERRED_ASSETS_WARNING_LABEL}
            css={css`
              width: 100%;
            `}
          >
            <EuiBadge color="warning" tabIndex={0}>
              {DEFERRED_ASSETS_WARNING_LABEL}{' '}
            </EuiBadge>
          </EuiToolTip>
        </span>
      </EuiFlexItem>
    );
  }

  let updateAvailableBadge: React.ReactNode | null = null;
  if (isUpdateAvailable && showLabels) {
    updateAvailableBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiBadge color="hollow" iconType="sortUp">
            <FormattedMessage
              id="xpack.fleet.packageCard.updateAvailableLabel"
              defaultMessage="Update available"
            />
          </EuiBadge>
        </span>
      </EuiFlexItem>
    );
  }

  let deprecatedBadge: React.ReactNode | null = null;

  if (isDeprecated && showLabels) {
    deprecatedBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiBadge color="warning" iconType="warning">
            <FormattedMessage
              id="xpack.fleet.packageCard.deprecatedLabel"
              defaultMessage="Deprecated"
            />
          </EuiBadge>
        </span>
      </EuiFlexItem>
    );
  }

  let collectionButton: React.ReactNode | null = null;
  if (isCollectionCard) {
    collectionButton = (
      <EuiFlexItem>
        <EuiButton
          color="text"
          data-test-subj="xpack.fleet.packageCard.collectionButton"
          iconType="package"
        >
          <FormattedMessage
            id="xpack.fleet.packageCard.collectionButton.copy"
            defaultMessage="View collection"
          />
        </EuiButton>
      </EuiFlexItem>
    );
  }

  let contentBadge: React.ReactNode | null = null;
  if (type === 'content') {
    contentBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiBadge color="hollow">
            <FormattedMessage
              id="xpack.fleet.packageCard.contentPackageLabel"
              defaultMessage="Content only"
            />
          </EuiBadge>
        </span>
      </EuiFlexItem>
    );
  }

  const { application } = useStartServices();

  const onCardClick = () => {
    if (url.startsWith(INTEGRATIONS_BASE_PATH)) {
      application.navigateToApp(INTEGRATIONS_PLUGIN_ID, {
        path: url.slice(INTEGRATIONS_BASE_PATH.length),
        state: { fromIntegrations },
      });
    } else if (url.startsWith('http') || url.startsWith('https')) {
      window.open(url, '_blank');
    } else {
      application.navigateToUrl(url);
    }
  };

  const installationStatusVisible = shouldShowInstallationStatus({
    installStatus,
    showInstallationStatus,
    isActive: hasDataStreams,
  });

  const testid = `integration-card:${id}`;
  return (
    <TrackApplicationView viewId={testid}>
      <EuiCard
        // EUI TODO: Custom component CSS
        // Min-height is roughly 3 lines of content.
        // This keeps the cards from looking overly unbalanced because of content differences.
        css={css`
          position: relative;
          [class*='euiCard__content'] {
            display: flex;
            flex-direction: column;
            block-size: 100%;
            overflow: hidden;
          }

          [class*='euiCard__description'] {
            flex-grow: 1;
            ${descriptionLineClamp
              ? installationStatusVisible
                ? getLineClampStyles(1) // Show only one line of description if installation status is shown
                : getLineClampStyles(descriptionLineClamp)
              : ''}
          }

          [class*='euiCard__titleButton'] {
            width: ${installationStatusVisible
              ? `calc(100% - ${theme.euiTheme.base * 4}px)`
              : '100%'};
            ${getLineClampStyles(titleLineClamp)}
          }

          min-height: ${minCardHeight ? `${minCardHeight}px` : '127px'};
          border-color: ${isQuickstart ? theme.euiTheme.colors.accent : null};
          max-height: ${maxCardHeight ? `${maxCardHeight}px` : null};
          overflow: ${maxCardHeight ? 'hidden' : null};
        `}
        data-test-subj={testid}
        betaBadgeProps={quickstartBadge(isQuickstart)}
        layout="horizontal"
        title={
          <CardTitle
            title={wrapTitleWithDeprecated({ title, deprecated: isDeprecated })}
            titleBadge={titleBadge}
          />
        }
        titleSize={titleSize}
        description={showDescription ? description : ''}
        hasBorder
        icon={
          <CardIcon
            icons={icons}
            packageName={name}
            integrationName={integration}
            version={version}
            size={showDescription ? 'xl' : 'xxl'}
          />
        }
        onClick={onClickProp ?? onCardClick}
      >
        <EuiFlexGroup
          gutterSize="xs"
          wrap={true}
          css={css`
            width: ${installationStatusVisible
              ? `calc(100% - ${theme.euiTheme.base * 4}px)`
              : '100%'};
            overflow-x: hidden;
            text-overflow: ellipsis;

            & > .euiFlexItem {
              min-width: 0;
            }

            ${isCollectionCard
              ? `& > .euiFlexItem:last-child {
              min-width: auto;
            }`
              : ''}
          `}
        >
          {showLabels && extraLabelsBadges ? extraLabelsBadges : null}
          {verifiedBadge}
          {updateAvailableBadge}
          {deprecatedBadge}
          {contentBadge}
          {releaseBadge}
          {hasDeferredInstallationsBadge}
          {collectionButton}
          <InstallationStatus
            installStatus={installStatus}
            showInstallationStatus={showInstallationStatus}
            compressed={showCompressedInstallationStatus}
            hasDataStreams={hasDataStreams}
          />
        </EuiFlexGroup>
      </EuiCard>
    </TrackApplicationView>
  );
}

const CardTitle = React.memo<Pick<IntegrationCardItem, 'title' | 'titleBadge'>>(
  ({ title, titleBadge }) => {
    if (!titleBadge) {
      return title;
    }
    return (
      <EuiFlexGroup
        direction="row"
        alignItems="flexStart"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem>
          <EuiTitle>
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{titleBadge}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

function quickstartBadge(isQuickstart: boolean): { label: string; color: 'accent' } | undefined {
  return isQuickstart
    ? {
        label: i18n.translate('xpack.fleet.packageCard.quickstartBadge.label', {
          defaultMessage: 'Quickstart',
        }),
        color: 'accent',
      }
    : undefined;
}
