/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { labels } from '../../../utils/i18n';

const EMPTY_STATE_PANEL_MAX_WIDTH_PX = 805;

const ILLUSTRATION_WELL_WIDTH_PX = 215;
const ILLUSTRATION_WELL_HEIGHT_PX = 252;

const ILLUSTRATION_IMAGE_SIZE_PX = 96;

export interface CustomizeLandingEmptyStateProps {
  illustrationSrc: string;
  title: React.ReactNode;
  description: React.ReactNode;
  learnMoreHref: string;
  learnMoreLabel?: string;
  learnMoreSuffix?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  footer?: React.ReactNode;
  dataTestSubj?: string;
}

export const CustomizeLandingEmptyState: React.FC<CustomizeLandingEmptyStateProps> = ({
  illustrationSrc,
  title,
  description,
  learnMoreHref,
  learnMoreLabel = labels.customizeLandingEmptyState.learnMore,
  learnMoreSuffix,
  primaryAction,
  secondaryAction,
  footer,
  dataTestSubj = 'customizeLandingEmptyState',
}) => {
  const { euiTheme } = useEuiTheme();

  const centerShellLayout = css`
    box-sizing: border-box;
    width: 100%;
    min-height: var(--kbn-application--content-height, 100vh);
    padding-block: ${euiTheme.size.xl};
    padding-inline: ${euiTheme.size.l};
  `;

  const responsiveStack = css`
    @media (max-width: ${euiTheme.breakpoint.m - 1}px) {
      flex-direction: column-reverse;
      align-items: stretch;
    }
  `;

  const illustrationWell = css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${ILLUSTRATION_WELL_WIDTH_PX}px;
    height: ${ILLUSTRATION_WELL_HEIGHT_PX}px;
    flex-shrink: 0;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};

    @media (max-width: ${euiTheme.breakpoint.m - 1}px) {
      width: 100%;
      max-width: ${ILLUSTRATION_WELL_WIDTH_PX}px;
      margin-inline: auto;
    }
  `;

  const panelCss = css`
    max-width: ${EMPTY_STATE_PANEL_MAX_WIDTH_PX}px;
    width: 100%;
  `;

  const footerRegionCss = css`
    padding: ${euiTheme.size.l};
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border-radius: 0 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium};
  `;

  const mainPadding = css`
    padding: ${euiTheme.size.l};
  `;

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      gutterSize="none"
      responsive={false}
      css={centerShellLayout}
    >
      <EuiPanel
        grow={false}
        data-test-subj={dataTestSubj}
        color="plain"
        hasShadow
        borderRadius="m"
        paddingSize="none"
        css={panelCss}
      >
        <div css={mainPadding}>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="xl"
            responsive={false}
            wrap={false}
            css={responsiveStack}
          >
            <EuiFlexItem grow>
              <EuiTitle size="m">
                <h2>{title}</h2>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText
                size="m"
                color="subdued"
                css={css`
                  text-align: left;
                `}
              >
                <div>
                  {description}{' '}
                  <EuiLink
                    data-test-subj={`${dataTestSubj}LearnMoreLink`}
                    href={learnMoreHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {learnMoreLabel}
                  </EuiLink>
                  {learnMoreSuffix}
                </div>
              </EuiText>
              {primaryAction || secondaryAction ? (
                <>
                  <EuiSpacer size="l" />
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                    {primaryAction ? <EuiFlexItem grow={false}>{primaryAction}</EuiFlexItem> : null}
                    {secondaryAction ? (
                      <EuiFlexItem grow={false}>{secondaryAction}</EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </>
              ) : null}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div css={illustrationWell}>
                <EuiImage
                  data-test-subj={`${dataTestSubj}Illustration`}
                  src={illustrationSrc}
                  alt=""
                  size={ILLUSTRATION_IMAGE_SIZE_PX}
                />
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        {footer ? (
          <>
            <div css={footerRegionCss}>{footer}</div>
          </>
        ) : null}
      </EuiPanel>
    </EuiFlexGroup>
  );
};
