/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared AWS catalog modal branding (overview + setup wizard) so logo/title do not shift
 * when navigating between views.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiThemeComputed, EuiTitleProps } from '@elastic/eui';

/** Shared AWS catalog modal title size (overview + setup wizard). */
export const AWS_CATALOG_INTEGRATION_TITLE_SIZE: NonNullable<EuiTitleProps['size']> = 'm';

/** Logo frame — keep in sync across AWS catalog views; used for setup stepper alignment. */
export const AWS_CATALOG_INTEGRATION_HEADER_LOGO_FRAME_PX = 48;
export const AWS_CATALOG_INTEGRATION_HEADER_LOGO_IMG_PX = 32;
export const AWS_CATALOG_INTEGRATION_HEADER_LOGO_RADIUS_PX = 10;

/** Reserves space for version label + primary action so the title column stays aligned. */
const AWS_CATALOG_INTEGRATION_TRAILING_MIN_WIDTH_PX = 320;

/** Consistent inset for AWS catalog modal content (EUI `size.l` = 24px). */
export const awsCatalogModalContentPadding = (euiTheme: EuiThemeComputed) => euiTheme.size.l;

export const awsCatalogIntegrationHeaderShellCss = (euiTheme: EuiThemeComputed) => css`
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  padding-inline: 0;
  padding-block: 0;
  background-color: ${euiTheme.colors.backgroundBasePlain};
`;

export interface AwsCatalogIntegrationLogoProps {
  readonly logoSrc?: string;
  readonly logoAlt: string;
}

export const AwsCatalogIntegrationLogo: React.FC<AwsCatalogIntegrationLogoProps> = ({
  logoSrc,
  logoAlt,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      style={{
        width: AWS_CATALOG_INTEGRATION_HEADER_LOGO_FRAME_PX,
        height: AWS_CATALOG_INTEGRATION_HEADER_LOGO_FRAME_PX,
        borderRadius: AWS_CATALOG_INTEGRATION_HEADER_LOGO_RADIUS_PX,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={logoAlt}
          style={{
            width: AWS_CATALOG_INTEGRATION_HEADER_LOGO_IMG_PX,
            height: AWS_CATALOG_INTEGRATION_HEADER_LOGO_IMG_PX,
            objectFit: 'contain',
          }}
        />
      ) : (
        <EuiIcon type="logoAWS" size="m" />
      )}
    </div>
  );
};

export interface AwsCatalogIntegrationBrandingRowProps {
  readonly logoSrc?: string;
  readonly logoAlt: string;
  readonly title: string;
  readonly titleId: string;
  readonly trailing?: React.ReactNode;
}

export const AwsCatalogIntegrationBrandingRow: React.FC<AwsCatalogIntegrationBrandingRowProps> = ({
  logoSrc,
  logoAlt,
  title,
  titleId,
  trailing,
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
    <EuiFlexItem grow={false}>
      <AwsCatalogIntegrationLogo logoSrc={logoSrc} logoAlt={logoAlt} />
    </EuiFlexItem>
    <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
      <EuiTitle size={AWS_CATALOG_INTEGRATION_TITLE_SIZE}>
        <h1 id={titleId}>{title}</h1>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem
      grow={false}
      css={css`
        min-width: ${AWS_CATALOG_INTEGRATION_TRAILING_MIN_WIDTH_PX}px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
      `}
    >
      {trailing ?? null}
    </EuiFlexItem>
  </EuiFlexGroup>
);

export interface AwsCatalogIntegrationHeaderProps {
  readonly logoSrc: string;
  readonly logoAlt: string;
  readonly title: string;
}

export const AwsCatalogIntegrationHeader: React.FC<AwsCatalogIntegrationHeaderProps> = ({
  logoSrc,
  logoAlt,
  title,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <header
      data-test-subj="streamsAwsCatalogIntegrationHeader"
      css={awsCatalogIntegrationHeaderShellCss(euiTheme)}
    >
      <AwsCatalogIntegrationBrandingRow
        logoSrc={logoSrc}
        logoAlt={logoAlt}
        title={title}
        titleId="streamsAwsCatalogIntegrationHeaderTitle"
      />
      <div
        aria-hidden
        css={css`
          padding-block-start: ${awsCatalogModalContentPadding(euiTheme)};
          padding-block-end: ${awsCatalogModalContentPadding(euiTheme)};
        `}
      >
        <div
          css={css`
            block-size: 1px;
            background-color: ${euiTheme.colors.borderBaseSubdued};
          `}
        />
      </div>
    </header>
  );
};
