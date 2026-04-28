/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  useEuiTheme,
  EuiIconTip,
  EuiStat,
  EuiText,
  EuiSpacer,
  EuiThemeProvider,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

export function Card({
  isDisabled,
  isSelected,
  title,
  titleTooltipContent,
  kpiValue,
  footer,
  onClick,
  isLoading = false,
  dataTestSubjTitle,
}: {
  isDisabled?: boolean;
  isSelected?: boolean;
  title: string;
  titleTooltipContent?: React.ReactNode;
  kpiValue: string;
  footer: React.ReactNode;
  onClick?: () => void;
  isLoading?: boolean;
  dataTestSubjTitle?: string;
}) {
  const { euiTheme } = useEuiTheme();
  const cardPadding = euiTheme.size.m;
  const isClickable = Boolean(onClick) && !isDisabled && !isSelected;

  const style = css`
    height: 100%;
    min-width: 300px;
    padding: 0;
    border-radius: ${euiTheme.border.radius.medium};
    border: ${isSelected
      ? `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderStrongPrimary}`
      : 'none'};
    background-color: ${isSelected ? euiTheme.colors.backgroundLightPrimary : 'inherit'};
  `;

  const buttonStyle = css`
    ${style}
    && {
      cursor: ${isClickable ? 'pointer' : 'default'};
    }

    ${isSelected
      ? css`
          &&,
          &&:hover,
          &&:focus,
          &&:focus-visible,
          &&:active {
            background-color: ${euiTheme.colors.backgroundLightPrimary};
            text-decoration: none;
            color: ${euiTheme.colors.textPrimary};
          }

          /* EuiButtonEmpty hover/active state uses a ::before overlay */
          &&::before,
          &&:hover::before,
          &&:active::before {
            content: none;
            display: none;
            background-color: transparent;
          }

          /* High-contrast mode can add a hover ::after border indicator */
          &&::after,
          &&:hover::after,
          &&:active::after {
            display: none;
          }

          && *,
          &&:hover *,
          &&:focus *,
          &&:active * {
            color: inherit;
            text-decoration: none;
          }
        `
      : undefined}
  `;

  const divStyle = css`
    ${style}
    padding: ${cardPadding};
  `;

  const dataTestSubject = `datasetQualityDetailsSummaryKpiCard-${dataTestSubjTitle || title}`;
  const displayKpiValue = isLoading ? '--' : kpiValue;

  const content = (
    <>
      <EuiStat
        title={
          <span data-test-subj={`datasetQualityDetailsSummaryKpiValue-${title}`}>
            {displayKpiValue}
          </span>
        }
        titleColor={isSelected ? 'primary' : 'default'}
        titleSize="m"
        descriptionElement="div"
        css={css`
          padding: ${euiTheme.size.xs};
          color: ${isSelected ? euiTheme.colors.textPrimary : euiTheme.colors.textParagraph};
        `}
        description={
          <>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s" css={css`font-weight: ${euiTheme.font.weight.semiBold};`}>{title}</EuiText>
              </EuiFlexItem>
              {titleTooltipContent && (
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    type="info"
                    content={
                      <EuiThemeProvider colorMode="dark">{titleTooltipContent}</EuiThemeProvider>
                    }
                    size="m"
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
          </>
        }
        textAlign="left"
      >
        <EuiSpacer size="xs" />

        {footer}
      </EuiStat>
    </>
  );

  return onClick ? (
    <EuiButtonEmpty
      isDisabled={isDisabled}
      onClick={isClickable ? onClick : undefined}
      css={buttonStyle}
      type="button"
      contentProps={{
        css: css`
          justify-content: flex-start;
          padding: ${cardPadding};
        `,
      }}
      aria-label={title}
      aria-pressed={Boolean(isSelected)}
      data-test-subj={dataTestSubject}
      color="text"
    >
      {content}
    </EuiButtonEmpty>
  ) : (
    <div css={divStyle} data-test-subj={dataTestSubject}>
      {content}
    </div>
  );
}
