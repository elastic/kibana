/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getAgentWorkspaceMountElement } from '../../agent_workspace/agent_workspace_flyout_defaults';

const DEFAULT_CART_FLYOUT_WIDTH = '50vw';
const CART_FLYOUT_MIN_WIDTH = 300;

interface AgentCartPushFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

/**
 * Push flyout for the attachment cart, scoped to the agent workspace column.
 */
export const AgentCartPushFlyout: React.FC<AgentCartPushFlyoutProps> = ({
  isOpen,
  onClose,
  ariaLabel,
  children,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const container = getAgentWorkspaceMountElement();

  const contentStyles = css`
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    background: ${euiTheme.colors.backgroundBasePlain};
  `;

  if (!isOpen || !container) {
    return null;
  }

  return (
    <EuiFlyout
      onClose={onClose}
      aria-label={ariaLabel}
      ownFocus={false}
      outsideClickCloses={false}
      minWidth={CART_FLYOUT_MIN_WIDTH}
      maxWidth={DEFAULT_CART_FLYOUT_WIDTH}
      resizable={true}
      size={DEFAULT_CART_FLYOUT_WIDTH}
      type="push"
      hideCloseButton={true}
      paddingSize="none"
      container={container}
      data-test-subj={dataTestSubj}
    >
      <div css={contentStyles}>{children}</div>
    </EuiFlyout>
  );
};
