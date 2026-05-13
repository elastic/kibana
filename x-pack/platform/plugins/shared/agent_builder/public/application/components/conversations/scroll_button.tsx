/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common/telemetry';

interface ScrollButtonProps {
  onClick: () => void;
}

export const ScrollButton: React.FC<ScrollButtonProps> = ({ onClick }) => {
  const { euiTheme } = useEuiTheme();

  const scrollDownButtonStyles = css`
    position: absolute;
    bottom: ${euiTheme.size.l};
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
  `;

  return (
    <EuiButtonIcon
      display="base"
      size="s"
      color="text"
      css={scrollDownButtonStyles}
      iconType="sortDown"
      aria-label="Scroll down"
      onClick={onClick}
      data-ebt-element={AGENT_BUILDER_UI_EBT.element.CONVERSATION_SCROLL}
      data-ebt-action={AGENT_BUILDER_UI_EBT.action.conversation.SCROLL_TO_LATEST}
    />
  );
};
