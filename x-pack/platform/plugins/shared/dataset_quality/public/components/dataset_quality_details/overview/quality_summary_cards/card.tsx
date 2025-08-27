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
}: {
  isDisabled?: boolean;
  isSelected?: boolean;
  title: string;
  titleTooltipContent?: React.ReactNode;
  kpiValue: string;
  footer: React.ReactNode;
  onClick?: () => void;
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

  const dataTestSubject = `datasetQualityDetailsSummaryKpiCard-${title}`;

  const content = (
    <>
      <EuiText textAlign="left">
        {titleTooltipContent ? (
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>{title}</EuiFlexItem>
            <EuiFlexItem>
              <EuiIconTip css={{ minWidth: '300px' }} content={titleTooltipContent} size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          title
        )}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText textAlign="left" data-test-subj={`datasetQualityDetailsSummaryKpiValue-${title}`}>
        <h2>{kpiValue}</h2>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText textAlign="left">{footer}</EuiText>
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
      data-test-subj={dataTestSubject}
    >
      {content}
    </EuiButtonEmpty>
  ) : (
    <div css={style} data-test-subj={dataTestSubject}>
      {content}
    </div>
  );
}
