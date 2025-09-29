/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  useEuiTheme,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSkeletonTitle,
  EuiSkeletonText,
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

  const style = css`
    height: 100%;
    min-width: 300px;
    border: ${isSelected
      ? `${euiTheme.border.width.thick} solid ${euiTheme.colors.borderStrongPrimary}`
      : 'none'};
    background-color: ${isSelected ? euiTheme.colors.backgroundLightPrimary : 'inherit'};
  `;

  const divStyle = css`
    ${style}
    padding: ${euiTheme.size.m};
  `;

  const dataTestSubject = `datasetQualityDetailsSummaryKpiCard-${dataTestSubjTitle || title}`;

  const content = (
    <>
      <EuiText textAlign="left">
        {titleTooltipContent ? (
          <EuiFlexGroup gutterSize="s" alignItems="center" wrap={false}>
            <EuiFlexItem grow={false}>{title}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip content={titleTooltipContent} size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          title
        )}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiSkeletonTitle size="m" isLoading={isLoading}>
        <EuiText textAlign="left" data-test-subj={`datasetQualityDetailsSummaryKpiValue-${title}`}>
          <h2>{kpiValue}</h2>
        </EuiText>
      </EuiSkeletonTitle>
      <EuiSpacer size="xs" />
      <EuiSkeletonText lines={1} isLoading={isLoading}>
        <EuiText textAlign="left">{footer}</EuiText>
      </EuiSkeletonText>
    </>
  );

  return onClick ? (
    <EuiButtonEmpty
      isDisabled={isDisabled}
      onClick={onClick}
      css={style}
      contentProps={{
        css: css`
          justify-content: flex-start;
        `,
      }}
      aria-label={title}
      data-test-subj={dataTestSubject}
    >
      {content}
    </EuiButtonEmpty>
  ) : (
    <div css={divStyle} data-test-subj={dataTestSubject}>
      {content}
    </div>
  );
}
