/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { borderRadiusXlStyles } from '../../../../../common.styles';

const labels = {
  reasoningError: i18n.translate('xpack.agentBuilder.round.error.reasoningError', {
    defaultMessage: 'Reasoning error',
  }),
};

interface ReasoningErrorPanelProps {
  children: React.ReactNode;
}
export const ReasoningErrorPanel: React.FC<ReasoningErrorPanelProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();

  const containerStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    ${borderRadiusXlStyles}
    border: 1px solid ${euiTheme.colors.borderStrongDanger};
    padding: ${euiTheme.size.base};
    ${useEuiShadow('l')};
  `;

  return (
    <EuiFlexGroup direction="column" css={containerStyles} responsive={false}>
      {/* Reasoning error panel title */}
      <EuiFlexGroup direction="row" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle
            size="xs"
            css={css`
              color: ${euiTheme.colors.textDanger};
            `}
          >
            <p>{labels.reasoningError}</p>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* Reasoning error panel content */}
      {children}
    </EuiFlexGroup>
  );
};
