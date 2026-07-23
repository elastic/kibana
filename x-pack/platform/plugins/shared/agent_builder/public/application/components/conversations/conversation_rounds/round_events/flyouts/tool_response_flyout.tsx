/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const toolResponseFlyoutTitle = i18n.translate(
  'xpack.agentBuilder.conversation.toolResponseFlyout.title',
  {
    defaultMessage: 'Inspect tool response',
  }
);

const toolResponseFlyoutText = i18n.translate(
  'xpack.agentBuilder.conversation.toolResponseFlyout.text',
  {
    defaultMessage: 'Inspect the response to the tool call in this step',
  }
);

interface ToolResponseFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const ToolResponseFlyout: React.FC<ToolResponseFlyoutProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="toolResponseFlyoutTitle"
      size="m"
      ownFocus={false}
      css={css`
        z-index: ${euiThemeVars.euiZFlyout + 4};
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="toolResponseFlyoutTitle">{toolResponseFlyoutTitle}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>{toolResponseFlyoutText}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
