/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import React from 'react';
import { roundedBorderRadiusStyles } from '../../conversation.styles';

const labels = {
  reasoningError: i18n.translate('xpack.onechat.round.error.reasoningError', {
    defaultMessage: 'Reasoning error',
  }),
  showThinkingPanel: i18n.translate('xpack.onechat.round.error.showThinkingPanel', {
    defaultMessage: 'Show',
  }),
};

interface RoundErrorThinkingTitleProps {
  onClick: () => void;
}
export const RoundErrorThinkingTitle = ({ onClick }: RoundErrorThinkingTitleProps) => {
  const { euiTheme } = useEuiTheme();

  const containerStyles = css`
    background-color: ${euiTheme.colors.backgroundBaseDanger};
    ${roundedBorderRadiusStyles}
    border: 1px solid ${euiTheme.colors.borderBaseDanger};
    padding: ${euiTheme.size.base};
    width: 100%;
  `;

  const textStyles = css`
    color: ${euiTheme.colors.textDanger};
    font-weight: ${euiTheme.font.weight.medium};
  `;

  return (
    <EuiFlexGroup
      direction="row"
      justifyContent="spaceBetween"
      responsive={false}
      alignItems="center"
      css={containerStyles}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s" responsive={false}>
          <EuiIcon type="warning" color={euiTheme.colors.textDanger} />
          <EuiText css={textStyles} size="s">
            {labels.reasoningError}
          </EuiText>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={onClick} color="text">
          <p>{labels.showThinkingPanel}</p>
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
