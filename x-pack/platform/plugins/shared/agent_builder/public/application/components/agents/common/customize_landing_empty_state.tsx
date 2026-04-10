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
  EuiHorizontalRule,
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

export interface CustomizeLandingEmptyStateProps {
  illustrationSrc: string;
  title: React.ReactNode;
  description: React.ReactNode;
  learnMoreHref: string;
  learnMoreLabel?: string;
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
  primaryAction,
  secondaryAction,
  footer,
  dataTestSubj = 'customizeLandingEmptyState',
}) => {
  const { euiTheme } = useEuiTheme();

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
    width: 168px;
    height: 168px;
    flex-shrink: 0;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};

    @media (max-width: ${euiTheme.breakpoint.m - 1}px) {
      width: 100%;
      max-width: 280px;
      margin-inline: auto;
    }
  `;

  const panelCss = css`
    max-width: 900px;
    width: 100%;
  `;

  const footerRegionCss = css`
    padding: ${euiTheme.size.m} ${euiTheme.size.l};
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border-radius: 0 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium};
  `;

  const mainPadding = css`
    padding: ${euiTheme.size.l};
  `;

  return (
    <EuiPanel
      data-test-subj={dataTestSubj}
      color="plain"
      hasBorder
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
            <EuiSpacer size="s" />
            <EuiText
              size="s"
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
              </div>
            </EuiText>
            {primaryAction || secondaryAction ? (
              <>
                <EuiSpacer size="m" />
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
                size="l"
              />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      {footer ? (
        <>
          <EuiHorizontalRule margin="none" />
          <div css={footerRegionCss}>{footer}</div>
        </>
      ) : null}
    </EuiPanel>
  );
};
