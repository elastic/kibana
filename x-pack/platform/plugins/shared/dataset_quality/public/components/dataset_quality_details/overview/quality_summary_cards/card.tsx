/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, useEuiTheme, EuiText, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

export function Card({
  isDisabled,
  isSelected,
  title,
  kpiValue,
  footer,
  onClick,
}: {
  isDisabled?: boolean;
  isSelected?: boolean;
  title: string;
  kpiValue: string;
  footer: React.ReactNode;
  onClick?: () => void;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiButtonEmpty
      isDisabled={isDisabled}
      onClick={onClick}
      css={css`
        height: 100%;
        min-width: 300px;
        border: ${isSelected
          ? `${euiTheme.border.width.thick} solid ${euiTheme.colors.borderStrongPrimary}`
          : 'none'};
        background-color: ${isSelected ? euiTheme.colors.backgroundLightPrimary : 'inherit'};
      `}
      contentProps={{
        css: css`
          justify-content: flex-start;
        `,
      }}
      data-test-subj={`datasetQualityDetailsSummaryKpiCard-${title}`}
    >
      <EuiText textAlign="left">{title}</EuiText>
      <EuiSpacer size="xs" />
      <EuiText textAlign="left" data-test-subj={`datasetQualityDetailsSummaryKpiValue-${title}`}>
        <h2>{kpiValue}</h2>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText textAlign="left">{footer}</EuiText>
    </EuiButtonEmpty>
  );
}
