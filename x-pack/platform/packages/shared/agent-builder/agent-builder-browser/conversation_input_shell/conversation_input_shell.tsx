/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { useEuiShadow, useEuiShadowHover, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

const INPUT_MIN_HEIGHT = '150px';
const AB_INPUT_RADIUS = 16;

export interface ConversationInputShellProps extends React.HTMLAttributes<HTMLDivElement> {
  isDisabled?: boolean;
  isCollapsed?: boolean;
}

/**
 * Visual shell for conversation input areas. Provides the shared border,
 * border-radius, shadow, and background styling used by the agent_builder
 * ConversationInput and any consumers that embed a compatible launcher UI.
 *
 * Accepts a forwarded ref (for e.g. measuring position before animations)
 * and standard HTML div attributes (aria-label, data-test-subj, etc.).
 * Additional Emotion `css` styles can be composed via the `css` JSX prop.
 */
export const ConversationInputShell = React.forwardRef<
  HTMLDivElement,
  PropsWithChildren<ConversationInputShellProps>
>(({ children, isDisabled = false, isCollapsed = false, className, ...rest }, ref) => {
  const { euiTheme } = useEuiTheme();
  const shadowS = useEuiShadow('s');
  const shadowSHover = useEuiShadowHover('s');
  const shadowXl = useEuiShadow('xl');
  const shadowXlHover = useEuiShadowHover('xl');

  const shellStyles = css`
    border: ${euiTheme.border.thin};
    border-radius: ${AB_INPUT_RADIUS}px;
    border-color: ${euiTheme.colors.borderBaseSubdued};
    background-color: ${isDisabled
      ? euiTheme.colors.backgroundBaseDisabled
      : euiTheme.colors.backgroundBasePlain};
    min-height: ${isCollapsed ? '0' : INPUT_MIN_HEIGHT};
    padding: ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.s} ${euiTheme.size.base};
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    align-items: stretch;
    width: 100%;
    transition: box-shadow 250ms, border-color 250ms, min-height 250ms ease-out;
    ${shadowS}
    &:hover {
      ${shadowSHover}
    }
    &:focus-within[aria-disabled='false'] {
      border-color: ${euiTheme.colors.primary};
      ${shadowXl}
      &:hover {
        ${shadowXlHover}
      }
    }
  `;

  return (
    <div {...rest} css={shellStyles} ref={ref} className={className} aria-disabled={isDisabled}>
      {children}
    </div>
  );
});

ConversationInputShell.displayName = 'ConversationInputShell';
