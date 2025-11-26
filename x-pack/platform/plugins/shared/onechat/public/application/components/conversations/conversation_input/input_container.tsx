/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, useEuiTheme, useEuiShadow, useEuiShadowHover } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { useConversationBorderRadius } from '../conversation.styles';

const INPUT_MIN_HEIGHT = '150px';
const useInputBorderStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    border: ${euiTheme.border.thin};
    ${useConversationBorderRadius('m')}
    border-color: ${euiTheme.colors.borderBaseSubdued};
    &:focus-within[aria-disabled='false'] {
      border-color: ${euiTheme.colors.primary};
    }
  `;
};
const useInputShadowStyles = () => {
  return css`
    ${useEuiShadow('s')}
    &:hover {
      ${useEuiShadowHover('s')}
    }
    &:focus-within[aria-disabled='false'] {
      ${useEuiShadow('xl')}
      :hover {
        ${useEuiShadowHover('xl')}
      }
    }
  `;
};

const containerAriaLabel = i18n.translate('xpack.onechat.conversationInput.container.label', {
  defaultMessage: 'Message input form',
});

export const InputContainer: React.FC<PropsWithChildren<{ isDisabled: boolean }>> = ({
  children,
  isDisabled,
}) => {
  const { euiTheme } = useEuiTheme();
  const inputContainerStyles = css`
    width: 100%;
    min-height: ${INPUT_MIN_HEIGHT};
    padding: ${euiTheme.size.base};
    flex-grow: 0;
    transition: box-shadow 250ms, border-color 250ms;

    ${useInputBorderStyles()}
    ${useInputShadowStyles()}

    &[aria-disabled='true'] {
      background-color: ${euiTheme.colors.backgroundBaseDisabled};
    }
  `;

  return (
    <EuiFlexGroup
      css={inputContainerStyles}
      direction="column"
      gutterSize="s"
      responsive={false}
      alignItems="stretch"
      justifyContent="center"
      data-test-subj="agentBuilderConversationInputForm"
      aria-label={containerAriaLabel}
      aria-disabled={isDisabled}
    >
      {children}
    </EuiFlexGroup>
  );
};
