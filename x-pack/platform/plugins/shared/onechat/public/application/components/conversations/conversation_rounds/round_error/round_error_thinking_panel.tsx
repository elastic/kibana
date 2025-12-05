/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { roundedBorderRadiusStyles } from '../../conversation.styles';

const labels = {
  reasoningError: i18n.translate('xpack.onechat.round.error.reasoningError', {
    defaultMessage: 'Reasoning error',
  }),
  closeAriaLabel: i18n.translate('xpack.onechat.round.error.closeAriaLabel', {
    defaultMessage: 'Close error panel',
  }),
};

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

interface RoundErrorThinkingPanelProps {
  children: React.ReactNode;
  onClose: () => void;
}
export const RoundErrorThinkingPanel: React.FC<RoundErrorThinkingPanelProps> = ({
  children,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();

  const fadeInStyles = css`
    animation: ${fadeIn} ${euiTheme.animation.normal} ease-in;
  `;

  const containerStyles = css`
    ${fadeInStyles}
    background-color: ${euiTheme.colors.backgroundBasePlain};
    ${roundedBorderRadiusStyles}
    border: 1px solid ${euiTheme.colors.borderStrongDanger};
    padding: ${euiTheme.size.base};
    ${useEuiShadow('l')};
  `;

  return (
    <EuiFlexGroup direction="column" css={containerStyles} responsive={false}>
      {/* Error thinking panel title */}
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
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            aria-label={labels.closeAriaLabel}
            iconType="cross"
            color="text"
            onClick={onClose}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* Error thinking panel content */}
      {children}
    </EuiFlexGroup>
  );
};
